'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let fields      = [];
let current     = {};
let original    = {};
let modelKey    = '';
let modelName   = '';
let vehicleClass = null;
let vehicleUpgrades = null;
let savedModels = {};
let activeTab   = '';
let fieldFilter = '';
let undoStack   = [];
let redoStack   = [];
let collapsedCategories = {};
let lockedFields = {};
let diffOpen   = false;
let livePreview = true;
let guideOpen   = false;
let guideStep   = 0;
let expertMode  = false;
let rollbackSlots = [];
let benchmarkActive = false;
let benchmarkStats = null;
let compareProfiles = {
    enabled: false,
    a: '',
    b: '',
};

const BUILTIN_PRESETS = [
    {
        id: 'race',
        label: 'Race',
        description: 'Track-biased setup with stable aero, strong grip, and clean response.',
        handling: {
            fMass: 1280,
            fInitialDriveForce: 0.31,
            fInitialDriveMaxFlatVel: 235,
            fDriveInertia: 1.0,
            fBrakeForce: 1.28,
            fBrakeBiasFront: 0.64,
            fSteeringLock: 36,
            fTractionCurveMax: 2.95,
            fTractionCurveMin: 2.6,
            fTractionCurveLateral: 25,
            fTractionLossMult: 0.82,
            fSuspensionForce: 7.1,
            fSuspensionCompDamp: 2.0,
            fSuspensionReboundDamp: 2.35,
            fAntiRollBarForce: 1.25,
            fAntiRollBarBiasFront: 0.53,
            fSuspensionRaise: -0.02,
        },
    },
    {
        id: 'time_attack',
        label: 'Time Attack',
        description: 'High-grip lap setup with aggressive braking and quick steering response.',
        handling: {
            fMass: 1240,
            fInitialDriveForce: 0.34,
            fInitialDriveMaxFlatVel: 245,
            fDriveInertia: 0.94,
            nInitialDriveGears: 6,
            fBrakeForce: 1.36,
            fBrakeBiasFront: 0.66,
            fSteeringLock: 38,
            fSteeringLockRatio: 0.56,
            fTractionCurveMax: 3.05,
            fTractionCurveMin: 2.68,
            fTractionCurveLateral: 24,
            fTractionLossMult: 0.78,
            fSuspensionForce: 7.6,
            fSuspensionCompDamp: 2.2,
            fSuspensionReboundDamp: 2.45,
            fAntiRollBarForce: 1.35,
            fAntiRollBarBiasFront: 0.54,
            fSuspensionRaise: -0.03,
        },
    },
    {
        id: 'drag',
        label: 'Drag',
        description: 'Straight-line acceleration setup with rear traction focus and softer steering.',
        handling: {
            fMass: 1300,
            fInitialDriveForce: 0.5,
            fInitialDriveMaxFlatVel: 300,
            fDriveBiasFront: 0.0,
            fDriveInertia: 0.7,
            nInitialDriveGears: 4,
            fClutchChangeRateScaleUpShift: 8.0,
            fClutchChangeRateScaleDownShift: 6.5,
            fBrakeForce: 0.95,
            fBrakeBiasFront: 0.62,
            fSteeringLock: 30,
            fTractionCurveMax: 2.45,
            fTractionCurveMin: 2.1,
            fLowSpeedTractionLossMult: 0.1,
            fTractionBiasFront: 0.44,
            fTractionLossMult: 0.9,
            fSuspensionForce: 4.0,
            fSuspensionCompDamp: 1.55,
            fSuspensionReboundDamp: 1.7,
            fAntiRollBarForce: 0.7,
            fSuspensionRaise: -0.01,
        },
    },
    {
        id: 'drift_easy',
        label: 'Drift - Easy Control',
        description: 'Forgiving drift baseline for learning transitions and angle control.',
        handling: {
            fMass: 1220,
            fInitialDriveForce: 0.40,
            fInitialDriveMaxFlatVel: 210,
            fDriveBiasFront: 0.0,
            fDriveInertia: 0.82,
            nInitialDriveGears: 5,
            fClutchChangeRateScaleUpShift: 6.5,
            fClutchChangeRateScaleDownShift: 6.0,
            fBrakeForce: 1.00,
            fBrakeBiasFront: 0.57,
            fHandBrakeForce: 1.45,
            fSteeringLock: 62,
            fSteeringLockRatio: 0.54,
            fTractionCurveMax: 1.95,
            fTractionCurveMin: 1.45,
            fTractionCurveLateral: 40,
            fTractionBiasFront: 0.52,
            fTractionLossMult: 1.55,
            fLowSpeedTractionLossMult: 0.75,
            fSuspensionForce: 4.6,
            fSuspensionCompDamp: 1.55,
            fSuspensionReboundDamp: 1.85,
            fAntiRollBarForce: 0.85,
            fAntiRollBarBiasFront: 0.38,
            fRollCentreHeightFront: -0.03,
            fRollCentreHeightRear: 0.05,
            fSuspensionRaise: -0.03,
        },
    },
    {
        id: 'drift_aggressive',
        label: 'Drift - Aggressive',
        description: 'High-angle drift baseline with easier initiation and smoother slide control.',
        handling: {
            fMass: 1180,
            fInitialDriveForce: 0.46,
            fInitialDriveMaxFlatVel: 205,
            fDriveBiasFront: 0.0,
            fDriveInertia: 0.72,
            nInitialDriveGears: 5,
            fClutchChangeRateScaleUpShift: 7.5,
            fClutchChangeRateScaleDownShift: 6.8,
            fBrakeForce: 1.02,
            fBrakeBiasFront: 0.55,
            fHandBrakeForce: 1.65,
            fSteeringLock: 66,
            fSteeringLockRatio: 0.58,
            fTractionCurveMax: 1.65,
            fTractionCurveMin: 1.18,
            fTractionCurveLateral: 44,
            fTractionBiasFront: 0.54,
            fTractionLossMult: 1.95,
            fLowSpeedTractionLossMult: 1.1,
            fSuspensionForce: 4.4,
            fSuspensionCompDamp: 1.45,
            fSuspensionReboundDamp: 1.75,
            fAntiRollBarForce: 0.75,
            fAntiRollBarBiasFront: 0.33,
            fRollCentreHeightFront: -0.05,
            fRollCentreHeightRear: 0.07,
            fSuspensionRaise: -0.04,
        },
    },
    {
        id: 'drift_wet',
        label: 'Drift - Wet / Low Grip',
        description: 'Very low-grip drift setup for rain maps and low-traction style sessions.',
        handling: {
            fMass: 1160,
            fInitialDriveForce: 0.44,
            fInitialDriveMaxFlatVel: 195,
            fDriveBiasFront: 0.0,
            fDriveInertia: 0.7,
            nInitialDriveGears: 5,
            fBrakeForce: 0.95,
            fBrakeBiasFront: 0.54,
            fHandBrakeForce: 1.75,
            fSteeringLock: 68,
            fSteeringLockRatio: 0.62,
            fTractionCurveMax: 1.45,
            fTractionCurveMin: 1.05,
            fTractionCurveLateral: 46,
            fTractionBiasFront: 0.55,
            fTractionLossMult: 2.3,
            fLowSpeedTractionLossMult: 1.5,
            fSuspensionForce: 4.1,
            fSuspensionCompDamp: 1.35,
            fSuspensionReboundDamp: 1.6,
            fAntiRollBarForce: 0.65,
            fAntiRollBarBiasFront: 0.3,
            fSuspensionRaise: -0.04,
        },
    },
    {
        id: 'offroad',
        label: 'Off-Road',
        description: 'Soft travel, stable grip, and predictable behavior over rough terrain.',
        handling: {
            fMass: 2250,
            fInitialDriveForce: 0.24,
            fInitialDriveMaxFlatVel: 170,
            fDriveBiasFront: 0.45,
            fBrakeForce: 0.98,
            fBrakeBiasFront: 0.62,
            fSteeringLock: 40,
            fTractionCurveMax: 2.45,
            fTractionCurveMin: 2.15,
            fTractionCurveLateral: 28,
            fLowSpeedTractionLossMult: 0.25,
            fTractionLossMult: 0.9,
            fSuspensionForce: 2.8,
            fSuspensionCompDamp: 1.35,
            fSuspensionReboundDamp: 1.7,
            fSuspensionUpperLimit: 0.28,
            fSuspensionLowerLimit: -0.32,
            fSuspensionRaise: 0.26,
            fAntiRollBarForce: 0.45,
            fAntiRollBarBiasFront: 0.5,
        },
    },
    {
        id: 'rally',
        label: 'Rally',
        description: 'Mixed-surface setup balancing tarmac speed and loose-surface control.',
        handling: {
            fMass: 1360,
            fInitialDriveForce: 0.31,
            fInitialDriveMaxFlatVel: 215,
            fDriveBiasFront: 0.46,
            fDriveInertia: 0.92,
            nInitialDriveGears: 6,
            fBrakeForce: 1.12,
            fBrakeBiasFront: 0.63,
            fSteeringLock: 44,
            fTractionCurveMax: 2.48,
            fTractionCurveMin: 2.08,
            fTractionCurveLateral: 30,
            fTractionLossMult: 1.08,
            fLowSpeedTractionLossMult: 0.45,
            fSuspensionForce: 3.8,
            fSuspensionCompDamp: 1.6,
            fSuspensionReboundDamp: 1.9,
            fSuspensionUpperLimit: 0.22,
            fSuspensionLowerLimit: -0.28,
            fSuspensionRaise: 0.12,
            fAntiRollBarForce: 0.62,
            fAntiRollBarBiasFront: 0.5,
        },
    },
    {
        id: 'street_grip',
        label: 'Street Grip',
        description: 'Fast road setup with smooth response and safe high-speed balance.',
        handling: {
            fMass: 1460,
            fInitialDriveForce: 0.27,
            fInitialDriveMaxFlatVel: 205,
            fDriveBiasFront: 0.5,
            fDriveInertia: 0.96,
            nInitialDriveGears: 6,
            fBrakeForce: 1.05,
            fBrakeBiasFront: 0.62,
            fSteeringLock: 37,
            fTractionCurveMax: 2.72,
            fTractionCurveMin: 2.35,
            fTractionCurveLateral: 27,
            fTractionLossMult: 0.96,
            fSuspensionForce: 4.9,
            fSuspensionCompDamp: 1.82,
            fSuspensionReboundDamp: 2.02,
            fAntiRollBarForce: 0.95,
            fAntiRollBarBiasFront: 0.5,
            fSuspensionRaise: -0.01,
        },
    },
    {
        id: 'daily',
        label: 'Daily',
        description: 'Comfortable street tune with mild stability and safe manners.',
        handling: {
            fMass: 1550,
            fInitialDriveForce: 0.22,
            fInitialDriveMaxFlatVel: 185,
            fDriveBiasFront: 0.5,
            fBrakeForce: 0.96,
            fBrakeBiasFront: 0.61,
            fSteeringLock: 36,
            fTractionCurveMax: 2.6,
            fTractionCurveMin: 2.3,
            fTractionCurveLateral: 27,
            fTractionLossMult: 1.0,
            fSuspensionForce: 4.2,
            fSuspensionCompDamp: 1.7,
            fSuspensionReboundDamp: 1.9,
            fAntiRollBarForce: 0.8,
            fAntiRollBarBiasFront: 0.5,
            fSuspensionRaise: 0,
        },
    },
    {
        id: 'highway_cruiser',
        label: 'Highway Cruiser',
        description: 'Stable long-distance setup with low twitch and gentle lane-change behavior.',
        handling: {
            fMass: 1680,
            fInitialDriveForce: 0.2,
            fInitialDriveMaxFlatVel: 180,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.05,
            fBrakeForce: 0.9,
            fBrakeBiasFront: 0.63,
            fSteeringLock: 33,
            fTractionCurveMax: 2.5,
            fTractionCurveMin: 2.25,
            fTractionCurveLateral: 26,
            fTractionLossMult: 0.95,
            fSuspensionForce: 3.9,
            fSuspensionCompDamp: 1.6,
            fSuspensionReboundDamp: 1.8,
            fAntiRollBarForce: 0.7,
            fAntiRollBarBiasFront: 0.52,
            fSuspensionRaise: 0.02,
        },
    },
    {
        id: 'economy',
        label: 'Economy / Commuter',
        description: 'Soft commuter setup with conservative acceleration and stable traction.',
        handling: {
            fMass: 1520,
            fInitialDriveForce: 0.18,
            fInitialDriveMaxFlatVel: 165,
            fDriveBiasFront: 0.58,
            fDriveInertia: 1.08,
            fBrakeForce: 0.86,
            fBrakeBiasFront: 0.62,
            fSteeringLock: 34,
            fTractionCurveMax: 2.42,
            fTractionCurveMin: 2.2,
            fTractionCurveLateral: 26,
            fTractionLossMult: 0.9,
            fSuspensionForce: 3.8,
            fSuspensionCompDamp: 1.55,
            fSuspensionReboundDamp: 1.72,
            fAntiRollBarForce: 0.62,
            fAntiRollBarBiasFront: 0.52,
            fSuspensionRaise: 0.03,
        },
    },
    {
        id: 'stunt',
        label: 'Stunt / Arcade',
        description: 'Arcade-friendly setup for quick rotation, snappy steering, and playful response.',
        handling: {
            fMass: 1180,
            fInitialDriveForce: 0.43,
            fInitialDriveMaxFlatVel: 235,
            fDriveBiasFront: 0.35,
            fDriveInertia: 0.78,
            nInitialDriveGears: 6,
            fBrakeForce: 1.2,
            fBrakeBiasFront: 0.6,
            fSteeringLock: 52,
            fSteeringLockRatio: 0.64,
            fTractionCurveMax: 2.25,
            fTractionCurveMin: 1.85,
            fTractionCurveLateral: 33,
            fTractionLossMult: 1.32,
            fSuspensionForce: 5.6,
            fSuspensionCompDamp: 1.9,
            fSuspensionReboundDamp: 2.05,
            fAntiRollBarForce: 1.05,
            fAntiRollBarBiasFront: 0.46,
            fSuspensionRaise: -0.01,
        },
    },
    {
        id: 'pursuit',
        label: 'Pursuit / Police',
        description: 'High-stability chase setup with strong braking and predictable turn-in.',
        handling: {
            fMass: 1620,
            fInitialDriveForce: 0.29,
            fInitialDriveMaxFlatVel: 220,
            fDriveBiasFront: 0.48,
            fDriveInertia: 0.92,
            nInitialDriveGears: 6,
            fBrakeForce: 1.26,
            fBrakeBiasFront: 0.66,
            fSteeringLock: 39,
            fTractionCurveMax: 2.82,
            fTractionCurveMin: 2.45,
            fTractionCurveLateral: 26,
            fTractionLossMult: 0.88,
            fSuspensionForce: 5.4,
            fSuspensionCompDamp: 1.95,
            fSuspensionReboundDamp: 2.15,
            fAntiRollBarForce: 1.08,
            fAntiRollBarBiasFront: 0.54,
            fSuspensionRaise: 0.0,
        },
    },
    {
        id: 'armored',
        label: 'Armored / Heavy',
        description: 'Heavy-duty setup with controlled body movement and predictable steering.',
        handling: {
            fMass: 3200,
            fInitialDriveForce: 0.2,
            fInitialDriveMaxFlatVel: 155,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.12,
            fBrakeForce: 1.05,
            fBrakeBiasFront: 0.67,
            fSteeringLock: 32,
            fTractionCurveMax: 2.72,
            fTractionCurveMin: 2.4,
            fTractionCurveLateral: 25,
            fTractionLossMult: 0.84,
            fSuspensionForce: 5.2,
            fSuspensionCompDamp: 1.85,
            fSuspensionReboundDamp: 2.1,
            fAntiRollBarForce: 1.2,
            fAntiRollBarBiasFront: 0.55,
            fSuspensionRaise: 0.06,
        },
    },
    {
        id: 'truck_cargo',
        label: 'Truck / Cargo',
        description: 'Cargo-focused setup with gradual steering and stable loaded behavior.',
        handling: {
            fMass: 6500,
            fInitialDriveForce: 0.14,
            fInitialDriveMaxFlatVel: 135,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.18,
            nInitialDriveGears: 8,
            fBrakeForce: 0.95,
            fBrakeBiasFront: 0.68,
            fSteeringLock: 29,
            fTractionCurveMax: 2.62,
            fTractionCurveMin: 2.32,
            fTractionCurveLateral: 24,
            fTractionLossMult: 0.86,
            fSuspensionForce: 3.4,
            fSuspensionCompDamp: 1.35,
            fSuspensionReboundDamp: 1.62,
            fSuspensionUpperLimit: 0.25,
            fSuspensionLowerLimit: -0.3,
            fSuspensionRaise: 0.16,
            fAntiRollBarForce: 0.82,
            fAntiRollBarBiasFront: 0.56,
        },
    },
    {
        id: 'tow_light_duty',
        label: 'Tow Truck / Light Duty',
        description: 'Balanced tow setup for city recovery with stable braking and turn-in.',
        handling: {
            fMass: 3800,
            fInitialDriveForce: 0.18,
            fInitialDriveMaxFlatVel: 150,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.12,
            nInitialDriveGears: 6,
            fBrakeForce: 1.05,
            fBrakeBiasFront: 0.69,
            fSteeringLock: 31,
            fTractionCurveMax: 2.58,
            fTractionCurveMin: 2.28,
            fTractionCurveLateral: 24,
            fTractionLossMult: 0.88,
            fSuspensionForce: 3.9,
            fSuspensionCompDamp: 1.45,
            fSuspensionReboundDamp: 1.72,
            fSuspensionUpperLimit: 0.22,
            fSuspensionLowerLimit: -0.28,
            fSuspensionRaise: 0.12,
            fAntiRollBarForce: 0.92,
            fAntiRollBarBiasFront: 0.58,
        },
    },
    {
        id: 'tow_city',
        label: 'Tow Truck / City Ops',
        description: 'Tighter low-speed maneuvering for urban pickups, alleys, and short recovery runs.',
        handling: {
            fMass: 3600,
            fInitialDriveForce: 0.19,
            fInitialDriveMaxFlatVel: 140,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.08,
            nInitialDriveGears: 6,
            fBrakeForce: 1.08,
            fBrakeBiasFront: 0.68,
            fSteeringLock: 34,
            fSteeringLockRatio: 0.52,
            fTractionCurveMax: 2.56,
            fTractionCurveMin: 2.28,
            fTractionCurveLateral: 24,
            fTractionLossMult: 0.9,
            fSuspensionForce: 3.7,
            fSuspensionCompDamp: 1.42,
            fSuspensionReboundDamp: 1.68,
            fSuspensionUpperLimit: 0.2,
            fSuspensionLowerLimit: -0.27,
            fSuspensionRaise: 0.1,
            fAntiRollBarForce: 0.86,
            fAntiRollBarBiasFront: 0.57,
        },
    },
    {
        id: 'tow_highway',
        label: 'Tow Truck / Highway Ops',
        description: 'High-speed stability profile for freeway response and long-distance transport.',
        handling: {
            fMass: 4200,
            fInitialDriveForce: 0.17,
            fInitialDriveMaxFlatVel: 165,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.14,
            nInitialDriveGears: 7,
            fBrakeForce: 1.12,
            fBrakeBiasFront: 0.71,
            fSteeringLock: 29,
            fSteeringLockRatio: 0.46,
            fTractionCurveMax: 2.66,
            fTractionCurveMin: 2.36,
            fTractionCurveLateral: 23,
            fTractionLossMult: 0.84,
            fSuspensionForce: 4.1,
            fSuspensionCompDamp: 1.5,
            fSuspensionReboundDamp: 1.78,
            fSuspensionUpperLimit: 0.23,
            fSuspensionLowerLimit: -0.29,
            fSuspensionRaise: 0.12,
            fAntiRollBarForce: 0.96,
            fAntiRollBarBiasFront: 0.61,
        },
    },
    {
        id: 'tow_mountain',
        label: 'Tow Truck / Mountain Recovery',
        description: 'Steep-grade recovery setup with stronger low-speed pull and safer downhill control.',
        handling: {
            fMass: 4500,
            fInitialDriveForce: 0.2,
            fInitialDriveMaxFlatVel: 130,
            fDriveBiasFront: 0.52,
            fDriveInertia: 1.16,
            nInitialDriveGears: 6,
            fBrakeForce: 1.18,
            fBrakeBiasFront: 0.72,
            fSteeringLock: 31,
            fSteeringLockRatio: 0.48,
            fTractionCurveMax: 2.74,
            fTractionCurveMin: 2.44,
            fTractionCurveLateral: 24,
            fLowSpeedTractionLossMult: 0.2,
            fTractionLossMult: 0.82,
            fSuspensionForce: 4.3,
            fSuspensionCompDamp: 1.56,
            fSuspensionReboundDamp: 1.84,
            fSuspensionUpperLimit: 0.25,
            fSuspensionLowerLimit: -0.31,
            fSuspensionRaise: 0.14,
            fAntiRollBarForce: 1.02,
            fAntiRollBarBiasFront: 0.62,
        },
    },
    {
        id: 'tow_heavy_recovery',
        label: 'Tow Truck / Heavy Recovery',
        description: 'Heavy recovery setup for large hauls with strong stability under load.',
        handling: {
            fMass: 5600,
            fInitialDriveForce: 0.15,
            fInitialDriveMaxFlatVel: 135,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.2,
            nInitialDriveGears: 8,
            fBrakeForce: 1.12,
            fBrakeBiasFront: 0.71,
            fSteeringLock: 28,
            fTractionCurveMax: 2.68,
            fTractionCurveMin: 2.38,
            fTractionCurveLateral: 23,
            fTractionLossMult: 0.82,
            fSuspensionForce: 4.2,
            fSuspensionCompDamp: 1.55,
            fSuspensionReboundDamp: 1.82,
            fSuspensionUpperLimit: 0.24,
            fSuspensionLowerLimit: -0.3,
            fSuspensionRaise: 0.14,
            fAntiRollBarForce: 1.0,
            fAntiRollBarBiasFront: 0.6,
        },
    },
    {
        id: 'service_flatbed',
        label: 'Service Flatbed',
        description: 'Utility flatbed setup for safe transport, smooth launches, and predictable stops.',
        handling: {
            fMass: 4200,
            fInitialDriveForce: 0.17,
            fInitialDriveMaxFlatVel: 145,
            fDriveBiasFront: 0.5,
            fDriveInertia: 1.15,
            nInitialDriveGears: 7,
            fBrakeForce: 1.0,
            fBrakeBiasFront: 0.69,
            fSteeringLock: 30,
            fTractionCurveMax: 2.55,
            fTractionCurveMin: 2.3,
            fTractionCurveLateral: 24,
            fTractionLossMult: 0.86,
            fSuspensionForce: 3.8,
            fSuspensionCompDamp: 1.45,
            fSuspensionReboundDamp: 1.7,
            fSuspensionUpperLimit: 0.22,
            fSuspensionLowerLimit: -0.28,
            fSuspensionRaise: 0.1,
            fAntiRollBarForce: 0.9,
            fAntiRollBarBiasFront: 0.58,
        },
    },
    {
        id: 'rain_safe',
        label: 'Rain / Low Grip Safety',
        description: 'Rain-ready setup with conservative steering and stable wet traction behavior.',
        handling: {
            fMass: 1500,
            fInitialDriveForce: 0.22,
            fInitialDriveMaxFlatVel: 175,
            fDriveBiasFront: 0.52,
            fDriveInertia: 1.0,
            fBrakeForce: 0.9,
            fBrakeBiasFront: 0.64,
            fSteeringLock: 34,
            fTractionCurveMax: 2.18,
            fTractionCurveMin: 1.95,
            fTractionCurveLateral: 30,
            fTractionLossMult: 1.18,
            fLowSpeedTractionLossMult: 0.5,
            fSuspensionForce: 4.1,
            fSuspensionCompDamp: 1.65,
            fSuspensionReboundDamp: 1.85,
            fAntiRollBarForce: 0.72,
            fAntiRollBarBiasFront: 0.52,
            fSuspensionRaise: 0.01,
        },
    },
    {
        id: 'heli_stable_patrol',
        label: 'Helicopter / Stable Patrol',
        description: 'Smooth and stable helicopter profile for patrol and utility flying.',
        handling: {
            fThrust: 1.2,
            fThrustFallOff: 0.35,
            fThrustVectoring: 0.55,
            fYawMult: 0.95,
            fRollMult: 1.05,
            fPitchMult: 1.0,
            fYawStabilise: 1.25,
            fRollStabilise: 1.3,
            fPitchStabilise: 1.2,
            fFormLiftMult: 1.0,
            fAttackLiftMult: 0.9,
            fAttackDiveMult: 0.85,
            fWindMult: 0.75,
            fMoveRes: 1.1,
            fTurnRes: 1.15,
            fEngineOffGlideMulti: 0.6,
        },
    },
    {
        id: 'heli_agile_response',
        label: 'Helicopter / Agile Response',
        description: 'Faster rotation and punchier thrust for aggressive maneuvering.',
        handling: {
            fThrust: 1.45,
            fThrustFallOff: 0.25,
            fThrustVectoring: 0.85,
            fYawMult: 1.35,
            fRollMult: 1.45,
            fPitchMult: 1.38,
            fYawStabilise: 0.95,
            fRollStabilise: 1.0,
            fPitchStabilise: 0.95,
            fFormLiftMult: 1.05,
            fAttackLiftMult: 1.1,
            fAttackDiveMult: 1.15,
            fWindMult: 0.9,
            fMoveRes: 0.95,
            fTurnRes: 0.9,
            fEngineOffGlideMulti: 0.7,
        },
    },
    {
        id: 'plane_cruise_stable',
        label: 'Plane / Cruise Stable',
        description: 'Balanced fixed-wing setup for smooth cruise and reliable approaches.',
        handling: {
            fThrust: 1.35,
            fThrustFallOff: 0.3,
            fThrustVectoring: 0.35,
            fYawMult: 0.75,
            fRollMult: 0.95,
            fPitchMult: 0.88,
            fYawStabilise: 1.35,
            fRollStabilise: 1.3,
            fPitchStabilise: 1.25,
            fFormLiftMult: 1.35,
            fAttackLiftMult: 1.0,
            fAttackDiveMult: 0.9,
            fGearDownDragV: 1.1,
            fGearDownLiftMult: 0.85,
            fWindMult: 0.75,
            fMoveRes: 1.2,
            fTurnRes: 1.25,
            fEngineOffGlideMulti: 1.35,
        },
    },
    {
        id: 'plane_stunt_aggressive',
        label: 'Plane / Stunt Aggressive',
        description: 'High-response aerobatic profile with quick roll and pitch authority.',
        handling: {
            fThrust: 1.75,
            fThrustFallOff: 0.18,
            fThrustVectoring: 0.7,
            fYawMult: 1.2,
            fRollMult: 1.65,
            fPitchMult: 1.55,
            fYawStabilise: 0.85,
            fRollStabilise: 0.8,
            fPitchStabilise: 0.78,
            fFormLiftMult: 1.15,
            fAttackLiftMult: 1.25,
            fAttackDiveMult: 1.35,
            fGearDownDragV: 1.35,
            fGearDownLiftMult: 0.72,
            fWindMult: 1.05,
            fMoveRes: 0.85,
            fTurnRes: 0.8,
            fEngineOffGlideMulti: 1.1,
        },
    },
];

const CLASS_PRESET_SUGGESTIONS = {
    0: ['daily', 'economy'],
    1: ['daily', 'highway_cruiser'],
    2: ['street_grip', 'offroad'],
    3: ['street_grip', 'race'],
    4: ['drift_easy', 'street_grip'],
    5: ['street_grip', 'race'],
    6: ['race', 'street_grip'],
    7: ['time_attack', 'race'],
    8: ['stunt', 'daily'],
    9: ['offroad', 'rally'],
    10: ['truck_cargo', 'armored'],
    11: ['service_flatbed', 'tow_light_duty'],
    12: ['highway_cruiser', 'service_flatbed'],
    15: ['heli_stable_patrol', 'heli_agile_response'],
    16: ['plane_cruise_stable', 'plane_stunt_aggressive'],
    17: ['service_flatbed', 'tow_city'],
    18: ['pursuit', 'rain_safe'],
    19: ['armored', 'truck_cargo'],
    20: ['truck_cargo', 'highway_cruiser'],
};

const SAFE_BOUNDS = {
    fInitialDriveForce: [0.05, 1.25],
    fInitialDriveMaxFlatVel: [60, 320],
    fBrakeForce: [0.2, 2.2],
    fSteeringLock: [20, 68],
    fTractionCurveMax: [0.8, 3.6],
    fTractionCurveMin: [0.7, 3.2],
    fTractionLossMult: [0.3, 3.2],
    fSuspensionForce: [1.2, 12.5],
    fSuspensionRaise: [-0.2, 0.35],
    fCollisionDamageMult: [0.0, 3.0],
    fWeaponDamageMult: [0.0, 3.0],
    fDeformationDamageMult: [0.0, 3.0],
    fEngineDamageMult: [0.0, 3.0],
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const overlay      = document.getElementById('hc-overlay');
const vehicleName  = document.getElementById('hc-vehicle-name');
const tabBar       = document.getElementById('hc-tabs');
const fieldsEl     = document.getElementById('hc-fields');
const categoryEmpty = document.getElementById('hc-category-empty');
const bodyCategory  = document.getElementById('hc-body-category');
const modeBadge     = document.getElementById('hc-mode-badge');
const statusEl     = document.getElementById('hc-status');
const btnUndo      = document.getElementById('btn-undo');
const btnRedo      = document.getElementById('btn-redo');
const btnToggleCategory = document.getElementById('btn-toggle-category');
const btnDiff      = document.getElementById('btn-diff');
const btnDiffClose = document.getElementById('btn-diff-close');
const btnExportXml = document.getElementById('btn-export-xml');
const btnExportPreset = document.getElementById('btn-export-preset');
const btnImportPreset = document.getElementById('btn-import-preset');
const presetSelect     = document.getElementById('preset-select');
const classSuggestSelect = document.getElementById('class-suggest-select');
const btnApplySuggest = document.getElementById('btn-apply-suggest');
const presetNameInput  = document.getElementById('preset-name-input');
const fieldFilterInput  = document.getElementById('field-filter-input');
const toggleLive       = document.getElementById('toggle-live');
const toggleExpert     = document.getElementById('toggle-expert');
const btnSnapshot      = document.getElementById('btn-snapshot');
const btnRollback      = document.getElementById('btn-rollback');
const btnBenchmark     = document.getElementById('btn-benchmark');
const btnAudit         = document.getElementById('btn-audit');
const btnSettings      = document.getElementById('btn-settings');
const btnRestorePreset = document.getElementById('btn-restore-preset');
const restoreSlotSelect = document.getElementById('restore-slot-select');
const compareSelectA   = document.getElementById('compare-select-a');
const compareSelectB   = document.getElementById('compare-select-b');
const btnCompareProfiles = document.getElementById('btn-compare-profiles');
const tooltip      = document.getElementById('hc-tooltip');
const tooltipLabel = document.getElementById('hc-tooltip-label');
const tooltipDesc  = document.getElementById('hc-tooltip-desc');
const tooltipTip   = document.getElementById('hc-tooltip-tip');
const diffPanel    = document.getElementById('hc-diff');
const diffSummary  = document.getElementById('diff-summary');
const diffList     = document.getElementById('diff-list');
const guidePanel   = document.getElementById('hc-guide');
const classHintEl  = document.getElementById('hc-class-hint');
const upgradeHintEl = document.getElementById('hc-upgrade-hint');
const settingsPanel = document.getElementById('hc-settings-panel');
const themeButtons = Array.from(document.querySelectorAll('.hc-theme-option'));
const modalBackdrop = document.getElementById('hc-modal-backdrop');
const modalTitle    = document.getElementById('hc-modal-title');
const modalSubtitle = document.getElementById('hc-modal-subtitle');
const modalTextarea = document.getElementById('hc-modal-textarea');
const modalCopyBtn  = document.getElementById('btn-modal-copy');
const modalDownloadBtn = document.getElementById('btn-modal-download');
const modalSubmitBtn = document.getElementById('btn-modal-submit');
const modalCloseBtn = document.getElementById('btn-modal-close');
const liveDiffEl = document.getElementById('hc-live-diff');

let modalMode = '';
const THEME_KEY = 'dg.handlingcontrol.theme';
const DEFAULT_THEME = 'dg-slate';
const AVAILABLE_THEMES = [
    'dg-default',
    'dg-slate',
    'dg-sunset',
    'dg-ice',
    'dg-carbon',
    'dg-ocean',
    'dg-forest',
    'dg-ember',
    'dg-royal',
    'dg-noir',
    'dg-sand',
    'dg-mint',
    'dg-crimson',
    'dg-voltage',
];

function updateThemeButtons(theme) {
    for (const btn of themeButtons) {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    }
}

function applyTheme(theme, persist = true) {
    const selected = AVAILABLE_THEMES.includes(theme) ? theme : DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', selected);
    updateThemeButtons(selected);
    if (persist) {
        localStorage.setItem(THEME_KEY, selected);
    }
}

function loadThemePreference() {
    const saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    applyTheme(saved, false);
}

function toggleSettingsPanel(force) {
    if (!settingsPanel) return;
    const shouldOpen = typeof force === 'boolean' ? force : settingsPanel.classList.contains('hidden');
    settingsPanel.classList.toggle('hidden', !shouldOpen);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className = type;
}

loadThemePreference();

function round(v, step) {
    if (step >= 1) return Math.round(v);
    const dec = (step.toString().split('.')[1] || '').length;
    return parseFloat(v.toFixed(dec));
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function cloneHandling(data) {
    return JSON.parse(JSON.stringify(data || {}));
}

function updateHistoryButtons() {
    btnUndo.disabled = undoStack.length <= 1;
    btnRedo.disabled = redoStack.length === 0;
}

function isBuiltinPresetValue(value) {
    return typeof value === 'string' && value.startsWith('builtin:');
}

function getBuiltinPreset(value) {
    const id = String(value || '').replace(/^builtin:/, '');
    return BUILTIN_PRESETS.find(preset => preset.id === id) || null;
}

function getPresetLabel(value) {
    const preset = getBuiltinPreset(value);
    return preset ? `Baseline: ${preset.label}` : String(value || '');
}

function getNamedHandling(value) {
    const key = String(value || '');
    if (!key) return null;
    const builtin = getBuiltinPreset(key);
    if (builtin) {
        return {
            key,
            label: `Baseline: ${builtin.label}`,
            handling: builtin.handling,
        };
    }
    if (savedModels[key]) {
        return {
            key,
            label: key,
            handling: savedModels[key],
        };
    }
    return null;
}

function getBuiltinPresetCategory(preset) {
    const id = preset && preset.id ? preset.id : '';
    if (id.startsWith('heli_') || id.startsWith('plane_')) return 'Aircraft';
    if (id.includes('drift')) return 'Drift';
    if (id === 'race' || id === 'time_attack' || id === 'drag') return 'Track & Speed';
    if (id === 'offroad' || id === 'rally') return 'Off-Road & Rally';
    if (id === 'truck_cargo' || id.includes('tow_') || id === 'service_flatbed' || id === 'armored') return 'Trucks & Utility';
    if (id === 'pursuit' || id === 'stunt') return 'Special Purpose';
    if (id === 'daily' || id === 'highway_cruiser' || id === 'economy' || id === 'street_grip' || id === 'rain_safe') return 'Street & Safety';
    return 'Other';
}

function updateCategoryHeader() {
    const collapsed = !!collapsedCategories[activeTab];
    bodyCategory.textContent = activeTab ? `CATEGORY: ${activeTab}` : 'CATEGORY';
    btnToggleCategory.textContent = collapsed ? 'EXPAND' : 'COLLAPSE';
    btnToggleCategory.disabled = !activeTab;
}

function updateVehicleClassDisplay() {
    const name = vehicleClass && vehicleClass.name ? vehicleClass.name : 'UNKNOWN CLASS';
    const id = vehicleClass && vehicleClass.id !== undefined ? vehicleClass.id : '';
    const classText = id === '' ? name : `${name} [${id}]`;
    const classId = vehicleClass && vehicleClass.id;
    const aircraftMode = classId === 15 || classId === 16;

    vehicleName.textContent = modelName + (modelKey ? ` [${modelKey}]` : '');
    classHintEl.textContent = `CLASS: ${classText} | HINT: ${getSuggestedFocus(classId)}`;
    if (upgradeHintEl) {
        const summary = vehicleUpgrades && vehicleUpgrades.summary ? vehicleUpgrades.summary : 'UPGRADES: N/A';
        upgradeHintEl.textContent = summary;
    }

    if (modeBadge) {
        modeBadge.textContent = aircraftMode ? 'AIRCRAFT MODE' : 'GROUND MODE';
        modeBadge.classList.toggle('mode-aircraft', aircraftMode);
        modeBadge.classList.toggle('mode-ground', !aircraftMode);
    }
}

function getSuggestedFocus(classId) {
    if (classId === undefined || classId === null) return 'None';
    switch (classId) {
        case 0: return 'Balanced Street / Suspension';
        case 1: return 'Sedan Grip / Brakes';
        case 2: return 'SUV Stability / Suspension';
        case 3: return 'Coupes / Engine & Steering';
        case 4: return 'Muscle / Traction & Drivetrain';
        case 5: return 'Classic Grip / Brakes';
        case 6: return 'Sports / Engine & Traction';
        case 7: return 'Super / Aerodynamics & Grip';
        case 8: return 'Bike / Steering & Balance';
        case 9: return 'Off-Road / Suspension';
        case 10: return 'Industrial / Durability';
        case 11: return 'Utility / Suspension';
        case 12: return 'Van / Stability';
        case 13: return 'Cycle / Minimal Tuning';
        case 14: return 'Boat / N/A';
        case 15: return 'Helicopter / Flight Control';
        case 16: return 'Plane / Flight Control';
        case 17: return 'Service / Stability';
        case 18: return 'Emergency / Brakes';
        case 19: return 'Military / Durability';
        case 20: return 'Commercial / Stability';
        case 21: return 'Train / N/A';
        default: return 'General Tuning';
    }
}

function getSuggestedPresetIds(classId) {
    return CLASS_PRESET_SUGGESTIONS[classId] || [];
}

function getSuggestedPresets(classId) {
    return getSuggestedPresetIds(classId)
        .map(id => BUILTIN_PRESETS.find(p => p.id === id))
        .filter(Boolean);
}

function refreshClassSuggestions() {
    classSuggestSelect.innerHTML = '<option value="">— Class Suggestion —</option>';
    const suggestions = getSuggestedPresets(vehicleClass && vehicleClass.id);
    for (const preset of suggestions) {
        const opt = document.createElement('option');
        opt.value = `builtin:${preset.id}`;
        opt.textContent = `Suggested: ${preset.label}`;
        classSuggestSelect.appendChild(opt);
    }
    btnApplySuggest.disabled = suggestions.length === 0;
}

function getSafeBounds(fieldKey) {
    return SAFE_BOUNDS[fieldKey] || null;
}

function sanitizeFieldValue(field, value, options = {}) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return Number(current[field.key] || field.min || 0);
    let next = numeric;
    let wasClamped = false;
    const bounds = getSafeBounds(field.key);
    if (!expertMode && bounds) {
        const before = next;
        next = clamp(next, bounds[0], bounds[1]);
        wasClamped = before !== next;
        if (wasClamped && !options.silent) {
            setStatus(`${field.label}: capped to safe range (${bounds[0]} to ${bounds[1]}). Enable Expert Mode to bypass.`, 'warn');
        }
    }
    next = clamp(next, field.min, field.max);
    return field.getter === 'GetVehicleHandlingInt' ? Math.round(next) : round(next, field.step);
}

function sanitizeHandlingForSafety(input, options = {}) {
    const out = cloneHandling(input);
    let blocked = 0;
    for (const f of fields) {
        if (out[f.key] === undefined) continue;
        const before = out[f.key];
        const next = sanitizeFieldValue(f, before, { silent: true });
        out[f.key] = next;
        if (Number(before) !== Number(next)) blocked++;
    }
    if (blocked > 0 && !expertMode && !options.silent) {
        setStatus(`Safety guard adjusted ${blocked} value(s). Toggle Expert Mode to allow extremes.`, 'warn');
    }
    return { handling: out, blocked };
}

function getRiskLevel(field, value) {
    const bounds = getSafeBounds(field.key);
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'safe';
    if (bounds && (numeric < bounds[0] || numeric > bounds[1])) return 'extreme';
    if (bounds) {
        const span = Math.max(0.0001, bounds[1] - bounds[0]);
        const ratio = (numeric - bounds[0]) / span;
        if (ratio < 0.12 || ratio > 0.88) return 'aggressive';
        return 'safe';
    }
    const range = Math.max(0.0001, field.max - field.min);
    const center = (field.max + field.min) / 2;
    const distance = Math.abs((numeric - center) / (range / 2));
    if (distance > 0.9) return 'extreme';
    if (distance > 0.7) return 'aggressive';
    return 'safe';
}

function updateLiveDiffSummary() {
    let changed = 0;
    let sumPct = 0;
    let pctCount = 0;
    for (const f of fields) {
        const curr = Number(current[f.key]);
        const base = Number(original[f.key]);
        if (!Number.isFinite(curr) || !Number.isFinite(base)) continue;
        if (curr !== base) changed++;
        if (base !== 0 && curr !== base) {
            sumPct += ((curr - base) / Math.abs(base)) * 100;
            pctCount++;
        }
    }
    const avgPct = pctCount > 0 ? (sumPct / pctCount) : 0;
    liveDiffEl.textContent = `Live Diff: ${changed} changed (${avgPct >= 0 ? '+' : ''}${avgPct.toFixed(2)}%)`;
}

function getRollbackStorageKey() {
    return `dg-handlingcontrol.rollback.${modelKey || 'unknown'}`;
}

function loadRollbackSlots() {
    rollbackSlots = [];
    if (!modelKey) return;
    try {
        const raw = localStorage.getItem(getRollbackStorageKey());
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) rollbackSlots = parsed.slice(0, 5);
    } catch (_) {}
}

function persistRollbackSlots() {
    if (!modelKey) return;
    try {
        localStorage.setItem(getRollbackStorageKey(), JSON.stringify(rollbackSlots.slice(0, 5)));
    } catch (_) {}
}

function captureRollbackSnapshot(reason) {
    if (!modelKey) return;
    rollbackSlots.unshift({
        ts: Date.now(),
        reason: reason || 'snapshot',
        handling: cloneHandling(current),
    });
    rollbackSlots = rollbackSlots.slice(0, 5);
    persistRollbackSlots();
}

async function rollbackLatestSnapshot() {
    if (!rollbackSlots.length) {
        setStatus('No rollback snapshot available yet.', 'error');
        return;
    }
    const snapshot = rollbackSlots[0];
    const sanitized = sanitizeHandlingForSafety(snapshot.handling, { silent: false });
    current = mergeHandlingWithLocks(current, sanitized.handling);
    renderFields();
    pushUndoSnapshot();
    await nuiFetch('applyAll', { handling: current });
    setStatus(`Rolled back to ${new Date(snapshot.ts).toLocaleTimeString()} (${snapshot.reason}).`, 'ok');
}

function setBenchmarkButtonState(active) {
    benchmarkActive = !!active;
    btnBenchmark.classList.toggle('benchmark-active', benchmarkActive);
    btnBenchmark.textContent = benchmarkActive ? '⏹ BENCH STOP' : '⏱ BENCH';
}

function updateDiffToggle() {
    btnDiff.textContent = diffOpen ? '⇆ DIFF ON' : '⇆ DIFF';
}

function updateLockStateFromMessage(data) {
    if (data && data.lockedFields && typeof data.lockedFields === 'object') {
        lockedFields = { ...data.lockedFields };
    }
}

function isFieldLocked(key) {
    return !!lockedFields[key];
}

function updateLockButton(button, key) {
    const locked = isFieldLocked(key);
    button.classList.toggle('active', locked);
    button.textContent = locked ? '🔒' : '🔓';
    button.title = locked ? 'Unlock this field' : 'Lock this field';
}

function mergeHandlingWithLocks(base, next) {
    const result = cloneHandling(base);
    for (const f of fields) {
        if (isFieldLocked(f.key)) continue;
        if (next[f.key] !== undefined) result[f.key] = next[f.key];
    }
    return result;
}

function getComparisonSource() {
    if (compareProfiles.enabled) {
        const sourceA = getNamedHandling(compareProfiles.a);
        const sourceB = getNamedHandling(compareProfiles.b);
        if (sourceA && sourceB) {
            return {
                mode: 'profiles',
                leftLabel: sourceA.label,
                leftHandling: sourceA.handling,
                rightLabel: sourceB.label,
                rightHandling: sourceB.handling,
            };
        }
    }

    const selected = presetSelect.value;
    if (selected) {
        if (isBuiltinPresetValue(selected)) {
            const preset = getBuiltinPreset(selected);
            if (preset) return { label: `Baseline: ${preset.label}`, handling: preset.handling };
        } else if (savedModels[selected]) {
            return { label: selected, handling: savedModels[selected] };
        }
    }
    return { mode: 'current', label: 'Stock / original', handling: original };
}

function renderDiffPanel() {
    if (!diffOpen) return;

    const source = getComparisonSource();
    const compare = source.mode === 'profiles' ? (source.rightHandling || {}) : (source.handling || {});
    const currentSource = source.mode === 'profiles' ? (source.leftHandling || {}) : current;
    const total = fields.length;
    let changed = 0;

    const leftLabel = source.mode === 'profiles' ? source.leftLabel : 'Current';
    const rightLabel = source.mode === 'profiles' ? source.rightLabel : source.label;

    diffSummary.textContent = source.mode === 'profiles'
        ? `Comparing ${leftLabel} vs ${rightLabel}. Fields with differences are highlighted.`
        : `Comparing current values against ${source.label}. Fields with differences are highlighted.`;
    diffList.innerHTML = '';

    if (!fields.length) {
        diffList.innerHTML = '<div class="diff-empty">No fields available to compare.</div>';
        return;
    }

    for (const f of fields) {
        const currentValue = currentSource[f.key];
        const compareValue = compare[f.key];
        const currentText = currentValue === undefined ? '—' : String(currentValue);
        const compareText = compareValue === undefined ? '—' : String(compareValue);
        const mismatch = currentValue !== compareValue;
        let pctText = 'Δ% N/A';
        if (typeof currentValue === 'number' && typeof compareValue === 'number' && compareValue !== 0) {
            const pct = ((currentValue - compareValue) / Math.abs(compareValue)) * 100;
            pctText = `Δ% ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        }
        if (mismatch) changed++;

        const row = document.createElement('div');
        row.className = 'diff-row' + (mismatch ? ' changed' : '');
        row.innerHTML = `
            <div class="diff-row-header">
                <div class="diff-row-label">${f.label}</div>
                <div class="diff-row-cat">${f.cat}</div>
            </div>
            <div class="diff-values">
                <div class="diff-value current ${mismatch ? 'mismatch' : ''}"><span>${leftLabel}</span>${currentText}</div>
                <div class="diff-value compare ${mismatch ? 'mismatch' : ''}"><span>${rightLabel}</span>${compareText}</div>
            </div>
            <div class="diff-percent">${pctText}</div>
        `;
        diffList.appendChild(row);
    }

    diffSummary.textContent = source.mode === 'profiles'
        ? `Comparing ${leftLabel} vs ${rightLabel}. ${changed} of ${total} fields differ.`
        : `Comparing current values against ${source.label}. ${changed} of ${total} fields differ.`;
}

function setDiffOpen(nextState) {
    diffOpen = !!nextState;
    diffPanel.classList.toggle('hidden', !diffOpen);
    updateDiffToggle();
    renderDiffPanel();
}

function updateDeltaDisplay(deltaEl, value, originalValue, step) {
    const decimals = Math.max(0, (String(step).split('.')[1] || '').length);
    const delta = round((value ?? 0) - (originalValue ?? 0), step);
    if (delta === 0) {
        deltaEl.className = 'hc-field-delta clean';
        deltaEl.textContent = 'No change';
        return;
    }
    deltaEl.className = 'hc-field-delta dirty';
    deltaEl.textContent = (delta > 0 ? '+' : '') + delta.toFixed(decimals);
}

function pushUndoSnapshot() {
    const snapshot = cloneHandling(current);
    const previous = undoStack[undoStack.length - 1];
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
    undoStack.push(snapshot);
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
}

function setCurrentHandling(next, options = {}) {
    current = cloneHandling(next);
    renderFields();
    updateLiveDiffSummary();
    if (options.pushHistory !== false) pushUndoSnapshot();
}

function applyCurrentHandling(next, options = {}) {
    setCurrentHandling(mergeHandlingWithLocks(current, next), options);
    return nuiFetch('applyAll', { handling: current });
}

function undoChange() {
    if (undoStack.length <= 1) return;
    redoStack.push(cloneHandling(current));
    undoStack.pop();
    current = cloneHandling(undoStack[undoStack.length - 1]);
    renderFields();
    updateLiveDiffSummary();
    nuiFetch('applyAll', { handling: current });
    updateHistoryButtons();
    setStatus('Undo applied.', 'ok');
}

function redoChange() {
    if (redoStack.length === 0) return;
    const snapshot = redoStack.pop();
    current = cloneHandling(snapshot);
    undoStack.push(cloneHandling(snapshot));
    renderFields();
    updateLiveDiffSummary();
    nuiFetch('applyAll', { handling: current });
    updateHistoryButtons();
    setStatus('Redo applied.', 'ok');
}

function setCategoryCollapsed(cat, collapsed) {
    if (!cat) return;
    collapsedCategories[cat] = collapsed;
    updateCategoryHeader();
    renderFields();
}

function isCategoryCollapsed(cat) {
    return !!collapsedCategories[cat];
}

function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64Utf8(text) {
    const binary = atob(text);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function setModalVisible(visible) {
    modalBackdrop.classList.toggle('hidden', !visible);
    if (visible) {
        setTimeout(() => modalTextarea.focus(), 0);
    }
}

function openExportModal(content, filename) {
    modalMode = 'export';
    modalTitle.textContent = 'Export Preset';
    modalSubtitle.textContent = 'Copy the JSON or download it as a file.';
    modalTextarea.value = content;
    modalTextarea.placeholder = '';
    modalSubmitBtn.textContent = 'CLOSE';
    modalCopyBtn.classList.remove('hidden');
    modalDownloadBtn.classList.remove('hidden');
    modalCopyBtn.textContent = 'COPY';
    modalDownloadBtn.textContent = 'DOWNLOAD';
    modalTextarea.dataset.filename = filename || 'preset.json';
    setModalVisible(true);
}

function openImportModal() {
    modalMode = 'import';
    modalTitle.textContent = 'Import Preset';
    modalSubtitle.textContent = 'Paste JSON or Base64 data, then import it into the current vehicle.';
    modalTextarea.value = '';
    modalTextarea.placeholder = 'Paste preset JSON or Base64 data here...';
    modalSubmitBtn.textContent = 'IMPORT';
    modalCopyBtn.classList.add('hidden');
    modalDownloadBtn.classList.add('hidden');
    setModalVisible(true);
}

function closeModal() {
    modalMode = '';
    setModalVisible(false);
}

async function exportModalCopy() {
    const ok = await copyText(modalTextarea.value);
    setStatus(ok ? 'Copied export data to clipboard.' : 'Clipboard copy failed.', ok ? 'ok' : 'error');
}

function exportModalDownload() {
    const filename = modalTextarea.dataset.filename || 'preset.json';
    downloadText(filename, modalTextarea.value, 'application/json');
    setStatus('Export downloaded.', 'ok');
}

function importModalSubmit() {
    const blob = modalTextarea.value.trim();
    if (!blob) {
        setStatus('Paste preset data before importing.', 'error');
        return;
    }

    let payload;
    try {
        payload = decodePresetBlob(blob);
    } catch (err) {
        setStatus('Invalid preset data.', 'error');
        return;
    }

    const handling = extractHandlingPayload(payload);
    if (!handling) {
        setStatus('Preset data did not contain handling values.', 'error');
        return;
    }

    const name = (payload && payload.presetName ? String(payload.presetName) : presetNameInput.value.trim() || modelName || 'Imported Preset').trim();
    const saveModelKey = modelKey || (payload && payload.modelKey ? String(payload.modelKey) : '');

    applyCurrentHandling(handling).then(async () => {
        if (name) {
            savedModels[name] = { _modelKey: saveModelKey, ...current };
            presetNameInput.value = name;
            refreshPresetDropdown();
            presetSelect.value = name;
            await nuiFetch('saveHandling', { presetName: name, modelKey: saveModelKey, handling: current });
        }

        captureRollbackSnapshot('import');

        setStatus(`Imported preset${name ? `: ${name}` : ''}.`, 'ok');
        closeModal();
    });
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatHandlingValue(value, step) {
    const decimals = Math.max(0, (String(step).split('.')[1] || '').length);
    const output = round(Number(value) || 0, step);
    return decimals > 0 ? output.toFixed(decimals) : String(Math.round(output));
}

function buildHandlingMetaXml(name, handling) {
    const handlingName = escapeXml(name || modelName || modelKey || 'CUSTOM_HANDLING');
    const items = fields
        .map(f => {
            const value = handling[f.key];
            if (value === undefined || value === null || Number.isNaN(Number(value))) return null;
            return `    <${f.key} value="${escapeXml(formatHandlingValue(value, f.step))}" />`;
        })
        .filter(Boolean)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<HandlingData>\n  <Item type="CHandlingData">\n    <handlingName>${handlingName}</handlingName>\n${items}\n  </Item>\n</HandlingData>\n`;
}

function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}

async function copyText(content) {
    try {
        await navigator.clipboard.writeText(content);
        return true;
    } catch (err) {
        return false;
    }
}

function extractHandlingPayload(input) {
    if (!input || typeof input !== 'object') return null;
    if (input.handling && typeof input.handling === 'object') return input.handling;
    const out = {};
    for (const f of fields) {
        if (input[f.key] !== undefined) out[f.key] = input[f.key];
    }
    return Object.keys(out).length > 0 ? out : null;
}

function decodePresetBlob(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
    return JSON.parse(fromBase64Utf8(raw));
}

// ─── NUI communication ────────────────────────────────────────────────────────
const RESOURCE_NAME = (typeof GetParentResourceName === 'function')
    ? GetParentResourceName()
    : 'dg-handlingcontrol';

function nuiFetch(event, data) {
    return fetch(`https://${RESOURCE_NAME}/${event}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    }).then(r => r.json()).catch(() => null);
}

function sendApplyField(f, val, isInt) {
    nuiFetch('applyField', { field: f.key, value: val, isInt: !!isInt });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
let tooltipVisible = false;

function showTooltip(f, e) {
    tooltipLabel.textContent = f.label;
    tooltipDesc.textContent  = f.desc || '';
    tooltipTip.textContent   = f.tip  || '';
    tooltipTip.style.display = f.tip ? '' : 'none';
    tooltip.classList.remove('hidden');
    tooltipVisible = true;
    positionTooltip(e);
}

function hideTooltip() {
    tooltip.classList.add('hidden');
    tooltipVisible = false;
}

function positionTooltip(e) {
    if (!tooltipVisible) return;
    const tw = tooltip.offsetWidth  || 380;
    const th = tooltip.offsetHeight || 140;
    let x = e.clientX + 18;
    let y = e.clientY + 12;
    if (x + tw > window.innerWidth  - 10) x = e.clientX - tw - 18;
    if (y + th > window.innerHeight - 10) y = e.clientY - th - 12;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
}

document.addEventListener('mousemove', e => { if (tooltipVisible) positionTooltip(e); });

// ─── Build UI ─────────────────────────────────────────────────────────────────
function buildUI() {
    const cats = [];
    for (const f of fields) {
        if (!cats.includes(f.cat)) cats.push(f.cat);
    }
    tabBar.innerHTML = '';
    for (const cat of cats) {
        const btn = document.createElement('button');
        btn.className = 'hc-tab' + (cat === activeTab ? ' active' : '');
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.addEventListener('click', () => switchTab(cat));
        tabBar.appendChild(btn);
    }
    renderFields();
}

function switchTab(cat) {
    activeTab = cat;
    document.querySelectorAll('.hc-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.cat === cat);
    });
    renderFields();
    if (guideOpen) applyGuideHighlights();
}

function renderFields() {
    fieldsEl.innerHTML = '';
    const needle = fieldFilter.trim().toLowerCase();
    const visible = fields.filter(f => {
        if (f.cat !== activeTab) return false;
        if (!needle) return true;
        return [f.key, f.label, f.cat, f.desc, f.tip].some(v => String(v || '').toLowerCase().includes(needle));
    });
    updateCategoryHeader();
    if (isCategoryCollapsed(activeTab)) {
        fieldsEl.classList.add('hidden');
        categoryEmpty.classList.remove('hidden');
        categoryEmpty.textContent = needle ? 'This category is collapsed.' : `The ${activeTab} category is collapsed.`;
        return;
    }
    fieldsEl.classList.remove('hidden');
    categoryEmpty.classList.add('hidden');
    for (const f of visible) {
        fieldsEl.appendChild(buildFieldCard(f));
    }
    if (guideOpen) applyGuideHighlights();
    renderDiffPanel();
    updateLiveDiffSummary();
}

function buildFieldCard(f) {
    const val   = current[f.key] ?? 0;
    const orig  = original[f.key] ?? val;
    const isInt = f.getter === 'GetVehicleHandlingInt';

    const card = document.createElement('div');
    card.className = 'hc-field' + (val !== orig ? ' dirty' : '');
    card.id = 'field-card-' + f.key;

    // Tooltip on hover
    card.addEventListener('mouseenter', e => showTooltip(f, e));
    card.addEventListener('mouseleave', hideTooltip);

    const label = document.createElement('div');
    label.className = 'hc-field-label';
    label.textContent = f.label;

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'hc-field-reset';
    resetBtn.title = 'Reset this field to the original value';
    resetBtn.textContent = '↺';

    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'hc-field-reset hc-field-lock';
    updateLockButton(lockBtn, f.key);
    lockBtn.addEventListener('click', () => {
        lockedFields[f.key] = !isFieldLocked(f.key);
        updateLockButton(lockBtn, f.key);
        if (guideOpen) applyGuideHighlights();
        renderDiffPanel();
        setStatus(`${f.label} ${isFieldLocked(f.key) ? 'locked' : 'unlocked'}.`, 'ok');
    });

    const labelRow = document.createElement('div');
    labelRow.className = 'hc-field-label-row';
    labelRow.appendChild(label);
    labelRow.appendChild(resetBtn);
    labelRow.appendChild(lockBtn);
    card.appendChild(labelRow);

    const topMeta = document.createElement('div');
    topMeta.className = 'hc-field-meta-top';
    const riskBadge = document.createElement('span');
    const riskLevel = getRiskLevel(f, val);
    riskBadge.className = `hc-risk-badge ${riskLevel}`;
    riskBadge.textContent = `Risk: ${riskLevel.toUpperCase()}`;
    topMeta.appendChild(riskBadge);
    card.appendChild(topMeta);

    const delta = document.createElement('div');
    delta.className = 'hc-field-delta' + (val !== orig ? ' dirty' : ' clean');
    updateDeltaDisplay(delta, val, orig, f.step);
    card.appendChild(delta);

    const row = document.createElement('div');
    row.className = 'hc-field-row';

    const btnMinus = document.createElement('button');
    btnMinus.className = 'hc-step';
    btnMinus.textContent = '−';

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.className = 'hc-slider';
    slider.min   = f.min;
    slider.max   = f.max;
    slider.step  = f.step;
    slider.value = clamp(val, f.min, f.max);

    const num = document.createElement('input');
    num.type  = 'number';
    num.className = 'hc-num';
    num.min   = f.min;
    num.max   = f.max;
    num.step  = f.step;
    num.value = round(val, f.step);

    const btnPlus = document.createElement('button');
    btnPlus.className = 'hc-step';
    btnPlus.textContent = '+';

    // Guard flag — prevents programmatic value assignments from re-firing events
    let syncing = false;

    function setInputs(v) {
        syncing = true;
        slider.value = v;
        num.value = v;
        syncing = false;
    }

    function syncFromSlider() {
        if (syncing) return;
        const v = sanitizeFieldValue(f, parseFloat(slider.value));
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    }

    function syncFromNum() {
        if (syncing) return;
        let v = sanitizeFieldValue(f, parseFloat(num.value) || 0);
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    }

    slider.addEventListener('input', syncFromSlider);
    // Use 'change' only on blur (user leaves the field) or Enter key —
    // NOT on programmatic assignment, which CEF can re-fire as a change event.
    num.addEventListener('change', syncFromNum);
    num.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); syncFromNum(); } });

    resetBtn.addEventListener('click', () => {
        const v = orig;
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    });

    function setNumeric(v) {
        const safe = sanitizeFieldValue(f, v);
        setInputs(safe);
        current[f.key] = safe;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, safe, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, safe, isInt);
    }

    btnMinus.addEventListener('click', () => {
        setNumeric(round(clamp((current[f.key] ?? 0) - f.step, f.min, f.max), f.step));
    });

    btnPlus.addEventListener('click', () => {
        setNumeric(round(clamp((current[f.key] ?? 0) + f.step, f.min, f.max), f.step));
    });

    row.appendChild(btnMinus);
    row.appendChild(slider);
    row.appendChild(num);
    row.appendChild(btnPlus);
    card.appendChild(row);

    const meta = document.createElement('div');
    meta.className = 'hc-field-meta';
    meta.innerHTML = `<span>MIN ${f.min}</span><span>STEP ${f.step}</span><span>MAX ${f.max}</span>`;
    card.appendChild(meta);

    return card;
}

function updateDirty(key, card) {
    card.classList.toggle('dirty', current[key] !== original[key]);
}

// ─── Preset dropdown ──────────────────────────────────────────────────────────
function refreshPresetDropdown() {
    presetSelect.innerHTML = '<option value="">— Load Preset —</option>';

    const categoryOrder = ['Track & Speed', 'Drift', 'Off-Road & Rally', 'Street & Safety', 'Trucks & Utility', 'Special Purpose', 'Aircraft', 'Other'];
    const grouped = {};
    for (const category of categoryOrder) grouped[category] = [];

    for (const preset of BUILTIN_PRESETS) {
        const category = getBuiltinPresetCategory(preset);
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(preset);
    }

    for (const category of categoryOrder) {
        const entries = grouped[category] || [];
        if (!entries.length) continue;
        const group = document.createElement('optgroup');
        group.label = `Built-in: ${category}`;
        for (const preset of entries) {
            const opt = document.createElement('option');
            opt.value = `builtin:${preset.id}`;
            opt.textContent = `Baseline: ${preset.label}`;
            opt.title = preset.description;
            group.appendChild(opt);
        }
        presetSelect.appendChild(group);
    }

    const savedGroup = document.createElement('optgroup');
    savedGroup.label = 'Saved Presets';
    for (const [key, data] of Object.entries(savedModels)) {
        const opt = document.createElement('option');
        opt.value = key;
        const isThisModel = data && data._modelKey === modelKey;
        opt.textContent = key + (isThisModel ? ' ★' : '');
        savedGroup.appendChild(opt);
    }
    presetSelect.appendChild(savedGroup);
    refreshCompareSelectors();
}

async function applyPresetValue(selectionValue, sourceLabel) {
    const key = String(selectionValue || '');
    if (!key) return;
    const builtin = getBuiltinPreset(key);
    const entry = builtin ? builtin.handling : savedModels[key];
    if (!entry) return;

    const sanitized = sanitizeHandlingForSafety(entry, { silent: false });
    current = mergeHandlingWithLocks(current, sanitized.handling);
    renderFields();
    pushUndoSnapshot();
    await nuiFetch('applyAll', { handling: current });
    captureRollbackSnapshot(sourceLabel || (builtin ? `builtin:${builtin.id}` : `preset:${key}`));
    setStatus(`${builtin ? 'Baseline' : 'Preset'} loaded & applied: ${builtin ? builtin.label : key}.`, 'ok');
}

function formatBenchmarkLine(data) {
    const elapsed = Number(data.elapsedSec || 0).toFixed(2);
    const speed = Number(data.speedKmh || 0).toFixed(1);
    const dist = Number(data.distanceM || 0).toFixed(1);
    const cp = `${Math.max(0, Number(data.checkpointIndex || 0))}/${Math.max(0, Number(data.checkpointTotal || 0))}`;
    const accel = Number(data.accel0to100Sec || 0) > 0 ? `${Number(data.accel0to100Sec).toFixed(2)}s` : '—';
    const brake = Number(data.brake100to20M || 0) > 0 ? `${Number(data.brake100to20M).toFixed(1)}m` : '—';
    return `Bench ${cp} | t ${elapsed}s | v ${speed} km/h | d ${dist}m | 0-100 ${accel} | 100-20 ${brake}`;
}

function refreshCompareSelectors() {
    const previousA = compareSelectA.value;
    const previousB = compareSelectB.value;
    compareSelectA.innerHTML = '<option value="">Compare A</option>';
    compareSelectB.innerHTML = '<option value="">Compare B</option>';

    for (const preset of BUILTIN_PRESETS) {
        const value = `builtin:${preset.id}`;
        const label = `Baseline: ${preset.label}`;
        const aOpt = document.createElement('option');
        aOpt.value = value;
        aOpt.textContent = label;
        compareSelectA.appendChild(aOpt);

        const bOpt = document.createElement('option');
        bOpt.value = value;
        bOpt.textContent = label;
        compareSelectB.appendChild(bOpt);
    }

    for (const key of Object.keys(savedModels)) {
        const aOpt = document.createElement('option');
        aOpt.value = key;
        aOpt.textContent = `Saved: ${key}`;
        compareSelectA.appendChild(aOpt);

        const bOpt = document.createElement('option');
        bOpt.value = key;
        bOpt.textContent = `Saved: ${key}`;
        compareSelectB.appendChild(bOpt);
    }

    if (previousA) compareSelectA.value = previousA;
    if (previousB) compareSelectB.value = previousB;
}

function formatAuditReport(payload) {
    const audit = Array.isArray(payload && payload.audit) ? payload.audit : [];
    const restore = payload && payload.restore && typeof payload.restore === 'object' ? payload.restore : {};

    const lines = [];
    lines.push('DG Handling Control Audit');
    lines.push('===========================');
    lines.push(`Entries: ${audit.length}`);
    lines.push(`Restore buckets: ${Object.keys(restore).length}`);
    lines.push('');
    lines.push('Recent Events:');

    for (const entry of audit.slice(0, 40)) {
        const stamp = entry.ts ? new Date(Number(entry.ts) * 1000).toISOString() : 'unknown-time';
        const action = entry.action || 'unknown';
        const player = entry.player || 'unknown-player';
        const preset = entry.presetName || '-';
        const model = entry.modelKey || '-';
        lines.push(`[${stamp}] ${action} | player=${player} | preset=${preset} | model=${model}`);
    }

    lines.push('');
    lines.push('Restore Buckets:');
    for (const [preset, bucket] of Object.entries(restore)) {
        const count = Array.isArray(bucket) ? bucket.length : 0;
        lines.push(`- ${preset}: ${count} point(s)`);
    }

    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP-BY-STEP TUNING GUIDE
// ─────────────────────────────────────────────────────────────────────────────
const GUIDE_STEPS = [
    {
        title: '1. Engine Basics',
        goal: 'Set the foundation: how heavy, how powerful, and how fast your vehicle is.',
        instructions: `Start here before touching anything else. Mass affects everything. Drive Force is your engine power. Max Speed is the hard ceiling.\n\nFor a performance tune: keep Mass realistic, raise Drive Force gradually until the car feels strong but not wheel-spiny, then set Max Speed to match your intended top speed.`,
        cat: 'Engine',
        fields: ['fMass', 'fInitialDriveForce', 'fInitialDriveMaxFlatVel'],
    },
    {
        title: '2. Drivetrain & Gearing',
        goal: 'Choose your drivetrain type and tune gear response for optimal power delivery.',
        instructions: `Drive Bias Front decides if the car is RWD, FWD, or AWD. Set this before anything else.\n\n• RWD (0.0): sporty, drifty, needs traction tuning.\n• AWD (0.45–0.55): balanced all-around.\n• FWD (1.0): stable but understeers.\n\nMore gears = wider power band. Lower inertia = snappier throttle.`,
        cat: 'Engine',
        fields: ['fDriveBiasFront', 'nInitialDriveGears', 'fDriveInertia', 'fClutchChangeRateScaleUpShift', 'fClutchChangeRateScaleDownShift'],
    },
    {
        title: '3. Brakes',
        goal: 'Match stopping power to engine power. Set front/rear bias correctly.',
        instructions: `Brake Force should scale with your Drive Force — a powerful engine needs powerful brakes.\n\n• Bias: 0.6–0.7 front is a classic performance bias. Lower = rear-heavy (spin risk). Higher = stable but understeers under braking.\n• Handbrake: higher for drift initiation, lower for grip racing.`,
        cat: 'Brakes',
        fields: ['fBrakeForce', 'fBrakeBiasFront', 'fHandBrakeForce'],
    },
    {
        title: '4. Steering',
        goal: 'Dial in how responsive and tight the steering feels at all speeds.',
        instructions: `Steering Lock is how far the wheels physically turn.\n• Drift cars: 55–65° for massive angle.\n• Track cars: 30–38° for high-speed stability.\n• Street: 35–42°.\n\nIf the car turns too slowly, raise Steering Lock. If it's twitchy at speed, lower it. Keep Lock Ratio near 0.5 for a natural progressive feel.`,
        cat: 'Steering',
        fields: ['fSteeringLock', 'fSteeringLockRatio'],
    },
    {
        title: '5. Traction Curve',
        goal: 'Set how much grip the tyres have and how they behave when sliding.',
        instructions: `This is the most technical section. Think in layers:\n\n1. TractionCurveMax — grip before sliding. Raise for more grip.\n2. TractionCurveMin — grip DURING a slide. Keep close to Max for predictable recovery. Large gap = snappy oversteer.\n3. TractionCurveLateral — slip angle before peak grip. Higher = more forgiving.\n4. LowSpeedTractionLoss — wheelspin off the line. Near 0 for launch traction, raise for burnout feel.`,
        cat: 'Traction',
        fields: ['fTractionCurveMax', 'fTractionCurveMin', 'fTractionCurveLateral', 'fLowSpeedTractionLossMult', 'fTractionBiasFront', 'fTractionLossMult'],
    },
    {
        title: '6. Suspension Springs & Ride Height',
        goal: 'Set spring stiffness and how high the car sits off the ground.',
        instructions: `Suspension Force = spring stiffness. This is the single biggest factor in how the car feels overall.\n\n• Race/track: 8–14. Stiff, flat, responsive.\n• Street performance: 4–7. Balanced.\n• Off-road/truck: 2–4. Soft and compliant.\n\nRide Height (Suspension Raise): negative slams it, positive raises for off-road. Lowering reduces center of gravity.`,
        cat: 'Suspension',
        fields: ['fSuspensionForce', 'fSuspensionRaise', 'fSuspensionBiasFront', 'fSuspensionUpperLimit', 'fSuspensionLowerLimit'],
    },
    {
        title: '7. Dampers & Roll Control',
        goal: 'Control body movement — bounce, dive, and lean in corners.',
        instructions: `Compression Damping = how fast suspension collapses on bumps (controls dive under braking).\nRebound Damping = how fast it extends back (controls bounce-back after a bump).\n\nKeep Comp and Rebound within 0.3–0.5 of each other for most setups.\n\nAnti-Roll Bar Force: raise it for a flatter, more grippy feel in corners. Anti-Roll Bias shifted front = understeer, rear = oversteer.`,
        cat: 'Suspension',
        fields: ['fSuspensionCompDamp', 'fSuspensionReboundDamp', 'fAntiRollBarForce', 'fAntiRollBarBiasFront', 'fRollCentreHeightFront', 'fRollCentreHeightRear'],
    },
    {
        title: '8. Damage & Final Save',
        goal: 'Set vehicle durability, test drive, then save your permanent preset.',
        instructions: `Admin/special vehicle: set all damage multipliers to 0 (god-mode hull).\nRealistic: leave at 1.0.\nTough vehicle: 0.3–0.5.\n\nOnce satisfied:\n1. Test drive the car.\n2. Return and click ↻ REFRESH to re-read live values.\n3. Fine-tune anything that still feels off.\n4. Click 💾 SAVE — the preset will auto-apply every time you enter this vehicle model.`,
        cat: 'Damage',
        fields: ['fCollisionDamageMult', 'fWeaponDamageMult', 'fDeformationDamageMult', 'fEngineDamageMult'],
    },
];

function openGuide() {
    guideOpen = true;
    guideStep = 0;
    guidePanel.classList.remove('hidden');
    renderGuideStep();
}

function closeGuide() {
    guideOpen = false;
    guidePanel.classList.add('hidden');
    clearGuideHighlights();
    setStatus('Ready. Hover a field for a detailed description.', '');
}

function renderGuideStep() {
    const step = GUIDE_STEPS[guideStep];

    document.getElementById('guide-step-badge').textContent = `STEP ${guideStep + 1} / ${GUIDE_STEPS.length}`;
    document.getElementById('guide-title').textContent = step.title;
    document.getElementById('guide-goal').textContent = step.goal;
    document.getElementById('guide-instructions').textContent = step.instructions;

    const list = document.getElementById('guide-fields-list');
    list.innerHTML = '';
    for (const key of step.fields) {
        const f = fields.find(x => x.key === key);
        if (!f) continue;
        const ref = document.createElement('div');
        ref.className = 'guide-field-ref';
        ref.innerHTML = `<div class="guide-field-ref-label">${f.label}</div><div class="guide-field-ref-tip">${f.tip || ''}</div>`;
        ref.addEventListener('click', () => jumpToField(f));
        list.appendChild(ref);
    }

    const dotsEl = document.getElementById('guide-dots');
    dotsEl.innerHTML = '';
    for (let i = 0; i < GUIDE_STEPS.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'guide-dot' + (i === guideStep ? ' active' : '');
        dot.title = GUIDE_STEPS[i].title;
        dot.addEventListener('click', () => { guideStep = i; renderGuideStep(); });
        dotsEl.appendChild(dot);
    }

    if (step.cat !== activeTab) switchTab(step.cat);
    if (isCategoryCollapsed(step.cat)) setCategoryCollapsed(step.cat, false);
    else { renderFields(); applyGuideHighlights(); }

    setStatus(`Guide Step ${guideStep + 1}/${GUIDE_STEPS.length}: ${step.title} — highlighted fields are your focus.`, '');
}

function applyGuideHighlights() {
    document.querySelectorAll('.hc-field.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
    if (!guideOpen) return;
    const step = GUIDE_STEPS[guideStep];
    for (const key of step.fields) {
        const card = document.getElementById('field-card-' + key);
        if (card) card.classList.add('guide-highlight');
    }
}

function clearGuideHighlights() {
    document.querySelectorAll('.hc-field.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
}

function jumpToField(f) {
    if (f.cat !== activeTab) {
        switchTab(f.cat);
        setTimeout(() => {
            const card = document.getElementById('field-card-' + f.key);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
    } else {
        const card = document.getElementById('field-card-' + f.key);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

document.getElementById('btn-guide').addEventListener('click', () => {
    if (guideOpen) closeGuide();
    else openGuide();
});

document.getElementById('btn-guide-next').addEventListener('click', () => {
    if (guideStep < GUIDE_STEPS.length - 1) { guideStep++; renderGuideStep(); }
    else closeGuide();
});

document.getElementById('btn-guide-prev').addEventListener('click', () => {
    if (guideStep > 0) { guideStep--; renderGuideStep(); }
});

btnDiff.addEventListener('click', () => {
    setDiffOpen(!diffOpen);
});

btnDiffClose.addEventListener('click', () => {
    setDiffOpen(false);
});

btnUndo.addEventListener('click', undoChange);
btnRedo.addEventListener('click', redoChange);
btnToggleCategory.addEventListener('click', () => {
    if (!activeTab) return;
    setCategoryCollapsed(activeTab, !isCategoryCollapsed(activeTab));
});

btnExportXml.addEventListener('click', async () => {
    if (!current || Object.keys(current).length === 0) {
        setStatus('Nothing to export yet.', 'error');
        return;
    }
    const exportName = presetNameInput.value.trim() || modelName || modelKey || 'HANDLING';
    const xml = buildHandlingMetaXml(exportName, current);
    await copyText(xml);
    downloadText(`handling-${(exportName || 'custom').replace(/[^a-z0-9_-]+/gi, '_')}.meta.xml`, xml, 'application/xml');
    setStatus('handling.meta XML copied and downloaded.', 'ok');
});

btnExportPreset.addEventListener('click', async () => {
    if (!current || Object.keys(current).length === 0) {
        setStatus('Nothing to export yet.', 'error');
        return;
    }
    const payload = {
        version: 1,
        presetName: presetNameInput.value.trim() || modelName || 'Custom Preset',
        modelKey: modelKey || '',
        modelName: modelName || '',
        handling: cloneHandling(current),
    };
    const json = JSON.stringify(payload, null, 2);
    openExportModal(json, `${(payload.presetName || 'preset').replace(/[^a-z0-9_-]+/gi, '_')}.json`);
    setStatus('Export ready. Copy or download from the modal.', 'ok');
});

btnImportPreset.addEventListener('click', async () => {
    openImportModal();
    setStatus('Paste preset data in the modal, then import it.', 'ok');
});

btnApplySuggest.addEventListener('click', async () => {
    const selection = classSuggestSelect.value;
    if (!selection) {
        setStatus('No class suggestion available for this vehicle.', 'error');
        return;
    }
    await applyPresetValue(selection, 'class-suggestion');
    presetSelect.value = selection;
});

btnSnapshot.addEventListener('click', () => {
    captureRollbackSnapshot('manual');
    setStatus('Snapshot captured for instant rollback.', 'ok');
});

btnRollback.addEventListener('click', async () => {
    await rollbackLatestSnapshot();
});

toggleExpert.addEventListener('change', () => {
    expertMode = toggleExpert.checked;
    setStatus(expertMode ? 'Expert Mode enabled. Extreme ranges are now allowed.' : 'Expert Mode disabled. Safe bounds are enforced.', expertMode ? 'warn' : 'ok');
    renderFields();
});

btnBenchmark.addEventListener('click', async () => {
    if (!benchmarkActive) {
        const started = await nuiFetch('benchmarkStart', {});
        if (started && started.ok) {
            setBenchmarkButtonState(true);
            setStatus('Teleported to airport. AI benchmark now includes hard turns and handbrake turns, then returns you.', 'ok');
        } else {
            setStatus('Could not start benchmark (you must be in driver seat).', 'error');
        }
    } else {
        await nuiFetch('benchmarkStop', {});
        setBenchmarkButtonState(false);
        setStatus('Benchmark loop stopped.', 'warn');
    }
});

if (btnSettings) {
    btnSettings.addEventListener('click', () => {
        toggleSettingsPanel();
    });
}

for (const themeBtn of themeButtons) {
    themeBtn.addEventListener('click', () => {
        const next = themeBtn.dataset.theme || 'dg-default';
        applyTheme(next, true);
        setStatus(`Theme changed to ${themeBtn.textContent}.`, 'ok');
        toggleSettingsPanel(false);
    });
}

btnCompareProfiles.addEventListener('click', () => {
    const a = compareSelectA.value;
    const b = compareSelectB.value;
    if (!a || !b) {
        setStatus('Pick both Compare A and Compare B first.', 'error');
        return;
    }
    if (a === b) {
        setStatus('Compare A and B must be different profiles.', 'error');
        return;
    }
    compareProfiles.enabled = true;
    compareProfiles.a = a;
    compareProfiles.b = b;
    setDiffOpen(true);
    setStatus('Profile comparison loaded in DIFF panel.', 'ok');
});

btnAudit.addEventListener('click', async () => {
    const payload = await nuiFetch('requestAudit', {});
    const text = formatAuditReport(payload || {});
    openExportModal(text, `handling-audit-${Date.now()}.txt`);
    setStatus('Audit report opened. Copy or download as needed.', 'ok');
});

btnRestorePreset.addEventListener('click', async () => {
    const key = presetSelect.value;
    if (!key || isBuiltinPresetValue(key)) {
        setStatus('Select a saved preset to restore.', 'error');
        return;
    }
    const slotIndex = Math.max(1, Math.min(5, Number(restoreSlotSelect && restoreSlotSelect.value || 1) || 1));
    const result = await nuiFetch('restorePreset', { presetName: key, slotIndex });
    if (!result || !result.ok) {
        setStatus('No restore point found for this preset.', 'error');
        return;
    }

    const restored = result.handling || null;
    if (restored) {
        savedModels[key] = restored;
        current = mergeHandlingWithLocks(current, restored);
        renderFields();
        pushUndoSnapshot();
        await nuiFetch('applyAll', { handling: current });
        captureRollbackSnapshot(`restore:${key}`);
    }
    setStatus(`Preset restored from slot ${slotIndex}: ${key}.`, 'ok');
});

fieldFilterInput.addEventListener('input', () => {
    fieldFilter = fieldFilterInput.value || '';
    renderFields();
});

modalCloseBtn.addEventListener('click', closeModal);
modalCopyBtn.addEventListener('click', exportModalCopy);
modalDownloadBtn.addEventListener('click', exportModalDownload);
modalSubmitBtn.addEventListener('click', () => {
    if (modalMode === 'export') {
        closeModal();
        return;
    }
    importModalSubmit();
});

modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
});

// ─── Button handlers ──────────────────────────────────────────────────────────
function doClose() {
    overlay.classList.add('hidden');
    closeGuide();
    toggleSettingsPanel(false);
    nuiFetch('close');
}

document.getElementById('btn-close').addEventListener('click', doClose);

document.getElementById('btn-read-live').addEventListener('click', async () => {
    setStatus('Reading live values…', 'warn');
    const live = await nuiFetch('readFields');
    if (live && Object.keys(live).length > 0) {
        current = mergeHandlingWithLocks(current, live);
        const upgradeData = await nuiFetch('getVehicleUpgrades');
        if (upgradeData && upgradeData.ok && upgradeData.upgrades) {
            vehicleUpgrades = upgradeData.upgrades;
            updateVehicleClassDisplay();
        }
        renderFields();
        pushUndoSnapshot();
        captureRollbackSnapshot('read-live');
        setStatus('Live values refreshed.', 'ok');
    } else {
        setStatus('Not in a vehicle.', 'error');
    }
});

document.getElementById('btn-reset-default').addEventListener('click', async () => {
    setStatus('Resetting to defaults…', 'warn');
    const defaults = await nuiFetch('resetToDefault');
    if (defaults && Object.keys(defaults).length > 0) {
        current = mergeHandlingWithLocks(current, defaults);
        renderFields();
        pushUndoSnapshot();
        captureRollbackSnapshot('defaults');
        setStatus('Handling reset to GTA defaults.', 'ok');
    } else {
        setStatus('Not in a vehicle — cannot reset.', 'error');
    }
});

document.getElementById('btn-apply-all').addEventListener('click', async () => {
    setStatus('Applying all…', 'warn');
    const sanitized = sanitizeHandlingForSafety(current, { silent: false });
    current = sanitized.handling;
    await nuiFetch('applyAll', { handling: current });
    captureRollbackSnapshot('apply-all');
    setStatus('All handling values applied to vehicle.', 'ok');
});

document.getElementById('btn-save-preset').addEventListener('click', async () => {
    const name = presetNameInput.value.trim();
    if (!name) { setStatus('Enter a preset name before saving.', 'error'); presetNameInput.focus(); return; }
    if (!modelKey) { setStatus('No vehicle model to save for.', 'error'); return; }
    setStatus('Saving preset…', 'warn');
    savedModels[name] = { _modelKey: modelKey, ...current };
    await nuiFetch('saveHandling', { presetName: name, modelKey, handling: current });
    captureRollbackSnapshot(`save:${name}`);
    refreshPresetDropdown();
    // Select the just-saved entry in the dropdown
    presetSelect.value = name;
    setStatus(`Preset "${name}" saved.`, 'ok');
});

document.getElementById('btn-delete-preset').addEventListener('click', async () => {
    const key = presetSelect.value;
    if (isBuiltinPresetValue(key)) { setStatus('Built-in baselines cannot be deleted.', 'error'); return; }
    if (!key) { setStatus('Select a preset to delete.', 'error'); return; }
    delete savedModels[key];
    await nuiFetch('deleteHandling', { modelKey: key });
    refreshPresetDropdown();
    setStatus(`Preset deleted: ${key}.`, 'ok');
});

presetSelect.addEventListener('change', async () => {
    const key = presetSelect.value;
    // Populate the name input with the selected preset's name
    if (key && !isBuiltinPresetValue(key)) presetNameInput.value = key;
    if (!key) return;

    compareProfiles.enabled = false;

    await applyPresetValue(key, 'preset-select');
});

toggleLive.addEventListener('change', () => {
    livePreview = toggleLive.checked;
});

// ─── NUI Message handler ──────────────────────────────────────────────────────
window.addEventListener('message', function(e) {
    const d = e.data;
    if (!d || !d.type) return;

    switch (d.type) {
        case 'open': {
            fields      = d.fields   || [];
            current     = d.current  || {};
            original    = { ...current };
            modelKey    = d.modelKey  || '';
            modelName   = d.modelName || 'UNKNOWN';
            vehicleClass = d.vehicleClass || null;
            vehicleUpgrades = d.upgrades || null;
            savedModels = {};
            collapsedCategories = {};
            lockedFields = {};
            benchmarkStats = null;
            setBenchmarkButtonState(false);
            compareProfiles = { enabled: false, a: '', b: '' };
            if (restoreSlotSelect) restoreSlotSelect.value = '1';

            if (d.savedMap) savedModels = d.savedMap;
            toggleSettingsPanel(false);

            activeTab = fields.length > 0 ? fields[0].cat : '';
            guideOpen = false;
            guidePanel.classList.add('hidden');
            diffOpen = false;
            diffPanel.classList.add('hidden');
            undoStack = [cloneHandling(current)];
            redoStack = [];
            fieldFilter = '';
            fieldFilterInput.value = '';

            // Pre-fill name input with a sensible default for this vehicle
            presetNameInput.value = modelName + (modelKey ? ' [' + modelKey + ']' : '');

            updateVehicleClassDisplay();
            refreshClassSuggestions();
            loadRollbackSlots();
            captureRollbackSnapshot('open');
            overlay.classList.remove('hidden');
            buildUI();
            refreshPresetDropdown();
            compareSelectA.value = 'builtin:daily';
            compareSelectB.value = 'builtin:race';
            updateHistoryButtons();
            updateCategoryHeader();
            updateDiffToggle();
            updateLiveDiffSummary();
            setStatus('Ready. Hover any field for a detailed description. Use 📋 GUIDE for step-by-step tuning.', '');
            break;
        }
        case 'close': {
            overlay.classList.add('hidden');
            closeGuide();
            setBenchmarkButtonState(false);
            break;
        }
        case 'benchmarkUpdate': {
            benchmarkStats = d.data || null;
            if (benchmarkStats) {
                setBenchmarkButtonState(true);
                setStatus(formatBenchmarkLine(benchmarkStats), 'warn');
            }
            break;
        }
        case 'benchmarkComplete': {
            benchmarkStats = d.data || null;
            setBenchmarkButtonState(false);
            if (benchmarkStats) {
                setStatus(`Benchmark complete. ${formatBenchmarkLine(benchmarkStats)}`, 'ok');
            } else {
                setStatus('Benchmark complete.', 'ok');
            }
            break;
        }
    }
});

// Escape key to close
window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        doClose();
    }
});

window.addEventListener('click', e => {
    if (!settingsPanel || settingsPanel.classList.contains('hidden')) return;
    if (settingsPanel.contains(e.target)) return;
    if (btnSettings && btnSettings.contains(e.target)) return;
    toggleSettingsPanel(false);
});

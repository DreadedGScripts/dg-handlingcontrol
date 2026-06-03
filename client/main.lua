-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║                  DG HANDLING CONTROL - CLIENT                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

local isOpen      = false
local savedData   = {}   -- [modelHash] = handling table, loaded from server
local restoreData = {}
local auditData   = {}
local currentVeh  = 0
local reapplyThread = nil
local benchmark = {
    active = false,
    vehicle = 0,
    startTime = 0,
    startPos = nil,
    endPos = nil,
    routePoints = {},
    routeIndex = 1,
    returnX = 0.0,
    returnY = 0.0,
    returnZ = 0.0,
    returnHeading = nil,
    runHeading = 0.0,
    lastPos = nil,
    distance = 0.0,
    checkpoints = {},
    checkpointIndex = 1,
    phase = 'idle',
    phaseStartTime = 0,
    targetSpeedKmh = 160.0,
    maneuverUntil = 0,
    maneuverSteering = 0.0,
    maneuverHandbrake = false,
    accel0to100 = nil,
    brakeStartDist = nil,
    brake100to20 = nil,
}
local benchmarkBlip = 0
local AIRPORT_BENCHMARK_START = vector3(-1314.20, -3018.60, 13.95)
local AIRPORT_BENCHMARK_HEADING = 60.0
local AIRPORT_BENCHMARK_DISTANCE = 700.0
local BENCHMARK_DRIVE_STYLE = 786603

local VEHICLE_CLASS_NAMES = {
    [0] = 'Compacts',
    [1] = 'Sedans',
    [2] = 'SUVs',
    [3] = 'Coupes',
    [4] = 'Muscle',
    [5] = 'Sports Classics',
    [6] = 'Sports',
    [7] = 'Super',
    [8] = 'Motorcycles',
    [9] = 'Off-Road',
    [10] = 'Industrial',
    [11] = 'Utility',
    [12] = 'Vans',
    [13] = 'Cycles',
    [14] = 'Boats',
    [15] = 'Helicopters',
    [16] = 'Planes',
    [17] = 'Service',
    [18] = 'Emergency',
    [19] = 'Military',
    [20] = 'Commercial',
    [21] = 'Trains',
}

-- ─── Handling field definitions ───────────────────────────────────────────────
-- Each entry: { key, getter, setter, min, max, step, label, cat, desc, tip }
local HANDLING_FIELDS = {
    -- ── Engine ──────────────────────────────────────────────────────────────
    {
        key='fMass', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=1, max=100000, step=10, label='Mass (kg)', cat='Engine',
        desc='The total weight of the vehicle in kilograms. Heavier vehicles carry more momentum, have better traction under power, and are harder to push sideways. Lighter vehicles accelerate faster but can feel twitchy and get unsettled by bumps or collisions.',
        tip='↑ Higher = More momentum, harder to stop & turn. ↓ Lower = Quicker to speed up, easier to spin out.',
    },
    {
        key='fInitialDragCoeff', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=200, step=0.1, label='Drag Coefficient', cat='Engine',
        desc='Air resistance acting against the vehicle at speed. A higher value means the car hits its top speed sooner and loses velocity quickly when you lift off throttle. Lower drag allows higher theoretical top speeds and longer coasting.',
        tip='↑ Higher = Lower top speed, more drag. ↓ Lower = More aerodynamic, higher top speed.',
    },
    {
        key='fDownforceModifier', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=100, step=0.1, label='Downforce Modifier', cat='Engine',
        desc='Simulates aerodynamic downforce pressing the tyres into the road at speed. More downforce dramatically improves high-speed cornering and stability but has no effect at low speeds. This is the "wings and splitter" stat.',
        tip='↑ Higher = Better high-speed grip and stability. ↓ Lower = Car feels lighter at speed, more oversteer.',
    },
    {
        key='fDriveBiasFront', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Drive Bias Front (0=RWD 1=FWD)', cat='Engine',
        desc='Controls how power is split between the front and rear wheels. 0.0 = pure Rear-Wheel Drive (sporty, prone to oversteer). 1.0 = pure Front-Wheel Drive (stable, prone to understeer). 0.5 = balanced All-Wheel Drive.',
        tip='0.0 = RWD (rear spins, drifty). 0.5 = AWD (balanced). 1.0 = FWD (front pulls, understeers).',
    },
    {
        key='nInitialDriveGears', getter='GetVehicleHandlingInt', setter='SetVehicleHandlingInt',
        min=1, max=10, step=1, label='Number of Gears', cat='Engine',
        desc='How many forward gears the gearbox has. More gears spread the power band wider, giving smoother acceleration and potentially a higher top speed. Fewer gears mean stronger individual gear pulls but a lower ceiling.',
        tip='↑ More gears = Smoother power, higher top speed. ↓ Fewer = Punchier but hits rev limiter sooner.',
    },
    {
        key='fInitialDriveForce', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.01, max=5, step=0.01, label='Drive Force (Torque)', cat='Engine',
        desc='The engine\'s torque output multiplier — essentially how hard the drivetrain pushes the wheels. Higher values give explosive acceleration but cause wheelspin, especially on low-traction surfaces. This is one of the most impactful stats.',
        tip='↑ Higher = Faster acceleration, more wheelspin. ↓ Lower = Smoother power delivery, less wheelspin.',
    },
    {
        key='fDriveInertia', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.01, max=5, step=0.01, label='Drive Inertia (Rev Speed)', cat='Engine',
        desc='How quickly the engine revs up and down in response to throttle input. Lower values feel like a high-revving sports car — instant response. Higher values add a "flywheel" weight effect, making the engine feel heavy and laggy like a diesel.',
        tip='↑ Higher = Sluggish throttle response, laggy rev. ↓ Lower = Instant revs, snappy throttle.',
    },
    {
        key='fClutchChangeRateScaleUpShift', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.1, max=20, step=0.1, label='Clutch Rate Up-Shift', cat='Engine',
        desc='How quickly the clutch re-engages when shifting up a gear. A higher value means almost no power interruption — gears slam in instantly like a racing sequential gearbox. Lower values create a longer neutral period between gears.',
        tip='↑ Higher = Faster up-shifts, near-seamless power delivery. ↓ Lower = Noticeable power gap between gears.',
    },
    {
        key='fClutchChangeRateScaleDownShift', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.1, max=20, step=0.1, label='Clutch Rate Down-Shift', cat='Engine',
        desc='How quickly the clutch re-engages when shifting down a gear. Higher values allow rapid heel-toe style downshifts with strong engine braking. Lower values make downshifts lazy — useful to prevent rear lock-up when trail braking.',
        tip='↑ Higher = Aggressive engine braking on downshift. ↓ Lower = Gentle downshifts, less lock-up risk.',
    },
    {
        key='fInitialDriveMaxFlatVel', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=10, max=500, step=1, label='Max Speed (km/h)', cat='Engine',
        desc='The absolute top speed the vehicle can reach on flat ground in km/h. This value acts as a hard ceiling — the engine will stop producing forward force above this speed. Gear ratios distribute torque across this range.',
        tip='↑ Higher = Faster top speed. ↓ Lower = Vehicle is capped sooner. Set to match your intended use.',
    },

    -- ── Brakes ──────────────────────────────────────────────────────────────
    {
        key='fBrakeForce', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.01, max=5, step=0.01, label='Brake Force', cat='Brakes',
        desc='The total stopping power of the brakes. Higher values dramatically shorten stopping distances but can cause wheel lock-up if the traction curve is not also tuned. Essential for performance tuning — weak brakes on a fast car is dangerous.',
        tip='↑ Higher = Shorter stops, risk of lock-up. ↓ Lower = Longer stops, gentler braking.',
    },
    {
        key='fBrakeBiasFront', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Brake Bias Front', cat='Brakes',
        desc='Distributes brake force between front and rear wheels. 0.5 is balanced. Moving toward 1.0 puts more force on the front — great for straight-line stability but causes understeer under braking. Moving toward 0.0 biases the rear — helps rotation but risks spinning.',
        tip='↑ Higher = More front braking, stable but understeers. ↓ Lower = Rear bias, rotation but spin risk. 0.6–0.7 is a typical performance tune.',
    },
    {
        key='fHandBrakeForce', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=5, step=0.01, label='Handbrake Force', cat='Brakes',
        desc='How hard the rear wheels lock when the handbrake is pulled. A strong handbrake makes the rear snap around quickly — great for initiating drifts and tight hairpins. Too weak and the car won\'t rotate; too strong and it\'ll spin uncontrollably.',
        tip='↑ Higher = Rear locks fast, good for drifts and handbrake turns. ↓ Lower = Subtler handbrake, harder to initiate rotation.',
    },

    -- ── Steering ────────────────────────────────────────────────────────────
    {
        key='fSteeringLock', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=10, max=90, step=0.5, label='Steering Lock (degrees)', cat='Steering',
        desc='The maximum angle the front wheels can turn from center in degrees. Higher lock gives a tighter turning radius and makes the car feel more nimble at low speeds. Too high at speed causes a twitchy, unstable feel. Drift cars typically run very high lock (45°+).',
        tip='↑ Higher = Tighter turning radius, twitchy at speed. ↓ Lower = Stable at speed, wider turns. Typical: 30–40°. Drift: 50–65°.',
    },
    {
        key='fSteeringLockRatio', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Steering Lock Ratio', cat='Steering',
        desc='Controls the speed/ratio at which the steering reaches its maximum lock angle. Higher values make the wheel reach full lock more quickly with less input — very responsive. Lower values require more steering wheel rotation to reach the limit.',
        tip='↑ Higher = Steering is quicker to reach full lock. ↓ Lower = More wheel movement needed, more progressive feel.',
    },

    -- ── Traction ────────────────────────────────────────────────────────────
    {
        key='fTractionCurveMax', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.1, max=5, step=0.01, label='Traction Curve Max (Peak Grip)', cat='Traction',
        desc='The maximum traction force available before the tyre begins to slip. Think of this as how much grip you have at the very edge — the peak of the traction curve. Higher values mean the tyres can handle more lateral and longitudinal load before sliding.',
        tip='↑ Higher = More grip before sliding, faster cornering. ↓ Lower = Tyres slip earlier, easier to drift.',
    },
    {
        key='fTractionCurveMin', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.1, max=5, step=0.01, label='Traction Curve Min (Slip Grip)', cat='Traction',
        desc='The traction available once the tyre IS sliding. This is how much control you retain during a slide or wheelspin. If this is close to TractionMax, the car recovers grip quickly and feels predictable. A large gap between Max and Min creates a snappy, sudden breakaway.',
        tip='↑ Higher (close to Max) = Smooth, predictable slides. ↓ Lower = Sudden snap oversteer, harder to catch.',
    },
    {
        key='fTractionCurveLateral', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=1, max=90, step=0.5, label='Traction Curve Lateral (Slip Angle)', cat='Traction',
        desc='The slip angle in degrees at which the tyre reaches peak lateral grip. A lower value means the tyre peaks quickly at small angles — very responsive but snappy. Higher values let you run more slip angle before peak grip — better for drifting and more progressive feel.',
        tip='↑ Higher angle = More progressive, drift-friendly. ↓ Lower angle = Tyre peaks fast, very grippy but can snap.',
    },
    {
        key='fTractionSpringDeltaMax', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Traction Spring Delta Max', cat='Traction',
        desc='The maximum wheel displacement (in meters) that still allows full traction generation. On rough terrain or mid-air, wheels can deflect. This value sets how much deflection is allowed before traction starts degrading — important for off-road tuning.',
        tip='↑ Higher = Maintains grip over larger bumps and wheel travel. ↓ Lower = Traction degrades quickly off smooth tarmac.',
    },
    {
        key='fLowSpeedTractionLossMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=10, step=0.1, label='Low-Speed Traction Loss', cat='Traction',
        desc='A multiplier for traction loss specifically at low speeds — simulates difficulty getting power down from a standing start. High values cause exaggerated wheelspin off the line, great for a burnout/drag race feel. Set to 0 for maximum traction at launch.',
        tip='↑ Higher = More wheelspin off the line, burnout-prone. ↓ Lower (or 0) = Maximum launch traction, less fun but faster.',
    },
    {
        key='fCamberStiffnesss', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-10, max=10, step=0.1, label='Camber Stiffness', cat='Traction',
        desc='How much the tyre\'s camber angle affects its stiffness and grip. Positive values increase grip when the wheel leans outward (like during a corner). Negative values simulate the opposite. Most road cars sit near 0. Affects the feel of cornering transitions.',
        tip='Positive = More grip as wheel cambers out in corners. Negative = Less grip. Near 0 is typical for road cars.',
    },
    {
        key='fTractionBiasFront', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Traction Bias Front', cat='Traction',
        desc='Splits available traction force between front and rear axles. 0.5 = equal. Higher values give the front tyres more traction budget — the front grips harder but the rear breaks away sooner (oversteer). Lower values give the rear more grip — better acceleration but the front may wash out (understeer) in corners.',
        tip='↑ Higher = Front grips more, rear can oversteer. ↓ Lower = Rear grips more, front can understeer. 0.5 = balanced.',
    },
    {
        key='fTractionLossMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=10, step=0.1, label='Traction Loss Multiplier', cat='Traction',
        desc='A global multiplier for how much traction is lost on any surface. Higher values make the car feel like it\'s always on a slippery surface — wet grass, ice — even on tarmac. Use higher values for a purposely slippery, drift-oriented tune. Lower values tighten everything up.',
        tip='↑ Higher = Slippier overall, drifty everywhere. ↓ Lower = Grippy everywhere. 1.0 = stock behaviour.',
    },

    -- ── Suspension ──────────────────────────────────────────────────────────
    {
        key='fSuspensionForce', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.5, max=20, step=0.1, label='Suspension Force (Spring Stiffness)', cat='Suspension',
        desc='The stiffness of the suspension springs. A stiffer setup (higher value) keeps the car flat in corners and responds quickly to inputs — essential for track cars. Softer springs (lower value) absorb road imperfections better but cause more body roll and dive under braking.',
        tip='↑ Higher = Stiffer, less roll, more responsive. ↓ Lower = Softer, more comfortable, more body lean.',
    },
    {
        key='fSuspensionCompDamp', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.1, max=5, step=0.01, label='Suspension Comp Damping', cat='Suspension',
        desc='Compression damping controls how quickly the suspension collapses when hitting a bump or braking. Higher values slow the compression down, preventing the car from "diving" into corners or over crests. Too high and the car becomes harsh and bounces over bumps.',
        tip='↑ Higher = Slower compression, less dive & squat. ↓ Lower = Quick to compress, more bounce over bumps.',
    },
    {
        key='fSuspensionReboundDamp', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0.1, max=5, step=0.01, label='Suspension Rebound Damping', cat='Suspension',
        desc='Rebound damping controls how quickly the suspension extends back after being compressed. Slow rebound (high value) keeps the tyre planted to the road after a bump. Fast rebound (low value) causes the car to "bounce" back violently, temporarily losing grip.',
        tip='↑ Higher = Slow return, tyre stays planted. ↓ Lower = Fast bounce-back, may hop or skip on rough roads.',
    },
    {
        key='fSuspensionUpperLimit', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-1, max=1, step=0.01, label='Suspension Upper Limit (m)', cat='Suspension',
        desc='The maximum distance in meters the suspension can extend upward from its neutral position. This limits how high the wheel can travel into the wheel arch. Reduce this to prevent wheels from clipping body panels, or increase it for more upward wheel travel.',
        tip='↑ Higher = More upward wheel travel allowed. ↓ Lower = Limits upward travel, can reduce visual clipping.',
    },
    {
        key='fSuspensionLowerLimit', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-1, max=0, step=0.01, label='Suspension Lower Limit (m)', cat='Suspension',
        desc='The maximum distance in meters the suspension can compress downward (droop). A less negative value means the wheel can\'t travel far downward — the car feels more rigid. A more negative value allows more droop, useful for off-road articulation.',
        tip='More negative = More downward wheel travel (good for off-road). Less negative = Stiffer compression limit.',
    },
    {
        key='fSuspensionRaise', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-1, max=1, step=0.01, label='Suspension Raise (Ride Height)', cat='Suspension',
        desc='Offsets the vehicle\'s ride height from its default position. Positive values raise the car — great for off-road or trucks. Negative values lower the car toward the ground — lowers the center of gravity and improves aerodynamics, but risks bottoming out.',
        tip='↑ Positive = Raises ride height (off-road, trucks). ↓ Negative = Lowers car (slammed, track, better CoG).',
    },
    {
        key='fSuspensionBiasFront', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Suspension Bias Front', cat='Suspension',
        desc='Distributes suspension stiffness between front and rear axles. 0.5 is balanced. Higher values make the front stiffer — reduces understeer but causes more rear squat. Lower values stiffen the rear — reduces oversteer but increases front dive under braking.',
        tip='↑ Higher = Stiffer front (less understeer). ↓ Lower = Stiffer rear (less oversteer). 0.5 = balanced.',
    },
    {
        key='fAntiRollBarForce', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=5, step=0.01, label='Anti-Roll Bar Force', cat='Suspension',
        desc='The strength of the anti-roll bars which resist body roll in corners. Higher values keep the car flatter in corners — better for grip driving. Lower values allow more body roll — the car leans more but can feel more communicative. Zero removes all sway bar effect.',
        tip='↑ Higher = Flatter in corners, more grip. ↓ Lower = More body lean, softer feel. 0 = no anti-roll bars.',
    },
    {
        key='fAntiRollBarBiasFront', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=1, step=0.01, label='Anti-Roll Bar Bias Front', cat='Suspension',
        desc='How much anti-roll force is applied to the front axle vs the rear. Higher values stiffen the front roll bar more — this reduces front grip and causes understeer. Lower values stiffen the rear more — this reduces rear grip and promotes oversteer.',
        tip='↑ Higher front bias = Understeer tendency. ↓ Lower (more rear) = Oversteer tendency. 0.5 = neutral balance.',
    },
    {
        key='fRollCentreHeightFront', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-2, max=2, step=0.01, label='Roll Centre Height Front (m)', cat='Suspension',
        desc='The height of the front suspension\'s roll center above the ground. Higher roll centers reduce body roll geometrically but can cause "jacking" — the car lifting on one side. Lower roll centers allow more roll but are more stable. This directly affects handling balance.',
        tip='↑ Higher = Less roll, more jacking tendency. ↓ Lower = More roll, more stable geometry.',
    },
    {
        key='fRollCentreHeightRear', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-2, max=2, step=0.01, label='Roll Centre Height Rear (m)', cat='Suspension',
        desc='The height of the rear suspension\'s roll center. Adjusting this relative to the front roll center changes how the car transitions through corners. A higher rear roll center than front promotes oversteer; lower rear promotes understeer.',
        tip='↑ Higher rear vs front = Oversteer tendency. ↓ Lower rear vs front = Understeer tendency.',
    },

    -- ── Damage ──────────────────────────────────────────────────────────────
    {
        key='fCollisionDamageMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=10, step=0.1, label='Collision Damage Mult', cat='Damage',
        desc='Multiplier for damage received from physical collisions with other vehicles, objects, and the environment. Set to 0 to make the vehicle completely immune to impact damage (effectively a god-mode hull). 1.0 = stock GTA damage. Higher values = glass cannon.',
        tip='0 = No collision damage. 1.0 = Normal damage. ↑ Higher = Very fragile. ↓ Lower = Tougher hull.',
    },
    {
        key='fWeaponDamageMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=10, step=0.1, label='Weapon Damage Mult', cat='Damage',
        desc='Multiplier for damage the vehicle takes from weapons — bullets, explosions, melee. Setting to 0 makes the vehicle bulletproof and explosion-resistant. 1.0 = standard GTA vulnerability. Use 0 for admin or special vehicles that should not be destroyable.',
        tip='0 = Bulletproof/explosion-proof. 1.0 = Normal. ↑ Higher = Destroyed by few shots.',
    },
    {
        key='fDeformationDamageMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=10, step=0.1, label='Deformation Damage Mult', cat='Damage',
        desc='Controls how much the vehicle body visually deforms on impact — crushed panels, bent hoods, etc. Set to 0 and the car will always look pristine no matter how hard you crash. Higher values make the bodywork crumple dramatically. Does not affect health, only visuals.',
        tip='0 = No body deformation (always clean). ↑ Higher = Dramatic crumpling on impact.',
    },
    {
        key='fEngineDamageMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=0, max=10, step=0.1, label='Engine Damage Mult', cat='Damage',
        desc='How quickly the engine takes damage from collisions, overheating, or weapons. Low values mean the engine is extremely tough — useful for race/pursuit vehicles. High values make the engine fragile — one good crash kills it. Set to 0 for an indestructible engine.',
        tip='0 = Indestructible engine. ↑ Higher = Engine dies quickly from damage or abuse.',
    },

    -- ── Misc ────────────────────────────────────────────────────────────────
    {
        key='fPetrolTankVolume', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=1, max=200, step=1, label='Petrol Tank Volume (L)', cat='Misc',
        desc='The volume of the fuel tank in liters. In vanilla GTA this is mostly visual/informational but frameworks with fuel systems (qb-fuel, LegacyFuel, etc.) will use this value to determine how long the vehicle can run before needing refueling.',
        tip='Affects fuel system mods. Larger tank = longer range before empty.',
    },
    {
        key='fOilVolume', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=1, max=20, step=0.1, label='Oil Volume (L)', cat='Misc',
        desc='The volume of the engine oil reservoir in liters. Primarily informational in vanilla GTA but can be used by custom frameworks or oil leak mechanics. Not a commonly tuned value for performance.',
        tip='Mostly informational. Used by some framework oil/engine mechanics.',
    },
    {
        key='fSeatOffsetDistX', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-2, max=2, step=0.01, label='Seat Offset X (Left/Right)', cat='Misc',
        desc='Offsets the driver seat position along the X axis (left/right). This is a cosmetic adjustment that affects where the camera is positioned inside the vehicle in first-person view. Does not affect vehicle performance.',
        tip='Negative = shifts seat left. Positive = shifts seat right. Cosmetic only.',
    },
    {
        key='fSeatOffsetDistY', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-2, max=2, step=0.01, label='Seat Offset Y (Forward/Back)', cat='Misc',
        desc='Offsets the driver seat position along the Y axis (forward/backward in the vehicle). Adjusts the first-person camera position inside the cabin. Useful for custom vehicles where the seat is not properly positioned.',
        tip='Negative = shifts seat forward. Positive = shifts seat backward. Cosmetic only.',
    },
    {
        key='fSeatOffsetDistZ', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat',
        min=-2, max=2, step=0.01, label='Seat Offset Z (Up/Down)', cat='Misc',
        desc='Offsets the driver seat position along the Z axis (up/down). Raises or lowers the driver\'s eye level in first-person view. Use this to fix custom vehicles where the camera clips into the roof or floats above it.',
        tip='Negative = lower seat. Positive = raise seat. Cosmetic only.',
    },
    {
        key='nMonetaryValue', getter='GetVehicleHandlingInt', setter='SetVehicleHandlingInt',
        min=0, max=9999999, step=1000, label='Monetary Value ($)', cat='Misc',
        desc='The in-game monetary value of the vehicle used by GTA internally for insurance calculations and some script systems. Does not affect performance. Can be read by custom scripts to calculate impound fees, insurance payouts, or vehicle worth.',
        tip='Cosmetic/system value. Used for in-game economy scripts and insurance calculations.',
    },
}

local AIRCRAFT_HANDLING_FIELDS = {
    {
        key='fThrust', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0.1, max=10, step=0.01, label='Thrust', cat='Flight',
        desc='Primary forward thrust multiplier for aircraft acceleration and climb capability.',
        tip='Higher = stronger acceleration and climb pull. Lower = sluggish aircraft response.',
    },
    {
        key='fThrustFallOff', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Thrust Falloff', cat='Flight',
        desc='Controls how quickly thrust effectiveness drops at higher speed.',
        tip='Higher = power drops off earlier. Lower = maintains thrust at speed.',
    },
    {
        key='fThrustVectoring', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Thrust Vectoring', cat='Flight',
        desc='Influences directional control from thrust vector behavior.',
        tip='Higher = more aggressive directional response from engine thrust.',
    },
    {
        key='fYawMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Yaw Multiplier', cat='Flight',
        desc='Yaw authority multiplier for turning around the vertical axis.',
        tip='Higher = faster yaw turns. Lower = slower yaw response.',
    },
    {
        key='fRollMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Roll Multiplier', cat='Flight',
        desc='Roll authority multiplier for banking behavior.',
        tip='Higher = snappier banking. Lower = slower roll-in.',
    },
    {
        key='fPitchMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Pitch Multiplier', cat='Flight',
        desc='Pitch authority multiplier for nose-up and nose-down response.',
        tip='Higher = more responsive pitch. Lower = softer pitch control.',
    },
    {
        key='fYawStabilise', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Yaw Stabilize', cat='Flight',
        desc='Damping/stability force on yaw movement.',
        tip='Higher = more stable yaw, less twitch. Lower = freer yaw rotation.',
    },
    {
        key='fRollStabilise', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Roll Stabilize', cat='Flight',
        desc='Damping/stability force on roll movement.',
        tip='Higher = steadier roll. Lower = looser bank behavior.',
    },
    {
        key='fPitchStabilise', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Pitch Stabilize', cat='Flight',
        desc='Damping/stability force on pitch movement.',
        tip='Higher = smoother pitch. Lower = more reactive pitch changes.',
    },
    {
        key='fFormLiftMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Form Lift Multiplier', cat='Flight',
        desc='Lift generated from aircraft body/wing form at speed.',
        tip='Higher = more lift and easier sustained flight.',
    },
    {
        key='fAttackLiftMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Attack Lift Multiplier', cat='Flight',
        desc='Lift effect multiplier based on angle of attack.',
        tip='Higher = stronger lift response when pitching into airflow.',
    },
    {
        key='fAttackDiveMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Attack Dive Multiplier', cat='Flight',
        desc='Dive behavior multiplier tied to angle of attack and pitch.',
        tip='Higher = steeper/faster dive response.',
    },
    {
        key='fGearDownDragV', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=20, step=0.01, label='Gear Down Drag', cat='Flight',
        desc='Additional drag applied with landing gear extended.',
        tip='Higher = greater speed loss with gear down.',
    },
    {
        key='fGearDownLiftMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Gear Down Lift Mult', cat='Flight',
        desc='Lift modifier applied while landing gear is down.',
        tip='Tune to stabilize approach behavior with gear deployed.',
    },
    {
        key='fWindMult', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Wind Multiplier', cat='Flight',
        desc='How strongly wind and air disturbance affect the aircraft.',
        tip='Higher = more turbulence sensitivity. Lower = steadier in wind.',
    },
    {
        key='fMoveRes', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Move Resistance', cat='Flight',
        desc='General movement resistance/inertia effect for aircraft motion.',
        tip='Higher = heavier, damped movement. Lower = freer movement.',
    },
    {
        key='fTurnRes', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Turn Resistance', cat='Flight',
        desc='Resistance against turning and rotational changes.',
        tip='Higher = slower turn-in, more stable. Lower = quicker rotation.',
    },
    {
        key='fEngineOffGlideMulti', getter='GetVehicleHandlingFloat', setter='SetVehicleHandlingFloat', handlingClass='CFlyingHandlingData',
        min=0, max=10, step=0.01, label='Engine Off Glide Mult', cat='Flight',
        desc='Glide characteristic multiplier when engine power is reduced or off.',
        tip='Higher = better glide retention without thrust.',
    },
}

-- ─── Helpers ──────────────────────────────────────────────────────────────────
local function getModelName(veh)
    return string.lower(GetLabelText(GetDisplayNameFromVehicleModel(GetEntityModel(veh))))
end

local function getVehicleClassInfo(veh)
    local classId = GetVehicleClass(veh)
    return {
        id = classId,
        name = VEHICLE_CLASS_NAMES[classId] or ('Class ' .. tostring(classId)),
    }
end

local function formatUpgradeLevel(modIndex, modCount)
    if modCount <= 0 then
        return 'N/A'
    end
    if modIndex < 0 then
        return 'Stock'
    end
    return ('%d/%d'):format(modIndex + 1, modCount)
end

local function getVehicleUpgradeInfo(veh)
    if veh == 0 or not DoesEntityExist(veh) then
        return {
            summary = 'UPGRADES: N/A',
        }
    end

    -- Ensure we are reading the primary mod kit.
    SetVehicleModKit(veh, 0)

    local engineCount = GetNumVehicleMods(veh, 11)
    local brakesCount = GetNumVehicleMods(veh, 12)
    local transCount = GetNumVehicleMods(veh, 13)
    local suspensionCount = GetNumVehicleMods(veh, 15)
    local armorCount = GetNumVehicleMods(veh, 16)
    local turboCount = GetNumVehicleMods(veh, 18)

    local engine = formatUpgradeLevel(GetVehicleMod(veh, 11), engineCount)
    local brakes = formatUpgradeLevel(GetVehicleMod(veh, 12), brakesCount)
    local transmission = formatUpgradeLevel(GetVehicleMod(veh, 13), transCount)
    local suspension = formatUpgradeLevel(GetVehicleMod(veh, 15), suspensionCount)
    local armor = formatUpgradeLevel(GetVehicleMod(veh, 16), armorCount)

    local turbo
    if turboCount <= 0 then
        turbo = 'N/A'
    else
        turbo = IsToggleModOn(veh, 18) and 'On' or 'Off'
    end

    local summary = ('UPGRADES: ENG %s | BRK %s | TRANS %s | SUSP %s | ARM %s | TURBO %s')
        :format(engine, brakes, transmission, suspension, armor, turbo)

    return {
        engine = engine,
        brakes = brakes,
        transmission = transmission,
        suspension = suspension,
        armor = armor,
        turbo = turbo,
        summary = summary,
    }
end

local function isAircraftClass(classId)
    return classId == 15 or classId == 16
end

local function getHandlingFieldsForVehicle(veh)
    if veh == 0 or not DoesEntityExist(veh) then
        return HANDLING_FIELDS
    end
    local classId = GetVehicleClass(veh)
    if isAircraftClass(classId) then
        return AIRCRAFT_HANDLING_FIELDS
    end
    return HANDLING_FIELDS
end

local function readAllFields(veh, fieldDefs)
    local selectedFields = fieldDefs or getHandlingFieldsForVehicle(veh)
    local out = {}
    for _, f in ipairs(selectedFields) do
        local handlingClass = f.handlingClass or 'CHandlingData'
        if f.getter == 'GetVehicleHandlingFloat' then
            out[f.key] = GetVehicleHandlingFloat(veh, handlingClass, f.key)
        elseif f.getter == 'GetVehicleHandlingInt' then
            out[f.key] = GetVehicleHandlingInt(veh, handlingClass, f.key)
        end
    end
    return out
end

local function applyHandling(veh, data, fieldDefs)
    local selectedFields = fieldDefs or getHandlingFieldsForVehicle(veh)
    for _, f in ipairs(selectedFields) do
        local handlingClass = f.handlingClass or 'CHandlingData'
        local val = data[f.key]
        if val ~= nil then
            if f.setter == 'SetVehicleHandlingFloat' then
                SetVehicleHandlingFloat(veh, handlingClass, f.key, val + 0.0)
            elseif f.setter == 'SetVehicleHandlingInt' then
                SetVehicleHandlingInt(veh, handlingClass, f.key, math.floor(val))
            end
        end
    end
end

local function setBenchmarkVehicleProtection(veh, enabled)
    if veh == 0 or not DoesEntityExist(veh) then
        return
    end

    SetEntityInvincible(veh, enabled)
    SetEntityCanBeDamaged(veh, not enabled)
    SetEntityProofs(veh, enabled, enabled, enabled, enabled, enabled, enabled, enabled, enabled)
    SetVehicleTyresCanBurst(veh, not enabled)
    SetVehicleCanBeVisiblyDamaged(veh, not enabled)
    SetDisableVehiclePetrolTankDamage(veh, enabled)
    SetDisableVehiclePetrolTankFires(veh, enabled)
end

local function setBenchmarkPedProtection(enabled)
    local ped = PlayerPedId()
    if ped == 0 or not DoesEntityExist(ped) then
        return
    end

    SetEntityInvincible(ped, enabled)
    SetEntityCanBeDamaged(ped, not enabled)
    SetPedCanRagdoll(ped, not enabled)
end

local function clearBenchmarkState()
    local wasActive = benchmark.active
    local prevVeh = benchmark.vehicle
    benchmark.active = false
    benchmark.vehicle = 0
    benchmark.startTime = 0
    benchmark.startPos = nil
    benchmark.endPos = nil
    benchmark.routePoints = {}
    benchmark.routeIndex = 1
    benchmark.returnX = 0.0
    benchmark.returnY = 0.0
    benchmark.returnZ = 0.0
    benchmark.returnHeading = nil
    benchmark.runHeading = 0.0
    benchmark.lastPos = nil
    benchmark.distance = 0.0
    benchmark.checkpoints = {}
    benchmark.checkpointIndex = 1
    benchmark.phase = 'idle'
    benchmark.phaseStartTime = 0
    benchmark.targetSpeedKmh = 160.0
    benchmark.maneuverUntil = 0
    benchmark.maneuverSteering = 0.0
    benchmark.maneuverHandbrake = false
    benchmark.accel0to100 = nil
    benchmark.brakeStartDist = nil
    benchmark.brake100to20 = nil
    if wasActive then
        setBenchmarkVehicleProtection(prevVeh, false)
        setBenchmarkPedProtection(false)
        ClearPedTasks(PlayerPedId())
    end
    if benchmarkBlip ~= 0 and DoesBlipExist(benchmarkBlip) then
        RemoveBlip(benchmarkBlip)
    end
    benchmarkBlip = 0
end

local function headingToDirection(heading)
    local rad = math.rad(heading)
    return vector3(-math.sin(rad), math.cos(rad), 0.0)
end

local function teleportVehicleToBenchmarkStart(veh)
    if veh == 0 or not DoesEntityExist(veh) then
        return false
    end

    SetEntityCoordsNoOffset(veh, AIRPORT_BENCHMARK_START.x, AIRPORT_BENCHMARK_START.y, AIRPORT_BENCHMARK_START.z, false, false, false)
    SetEntityHeading(veh, AIRPORT_BENCHMARK_HEADING)
    SetVehicleOnGroundProperly(veh)
    SetEntityVelocity(veh, 0.0, 0.0, 0.0)
    return true
end

local function returnFromBenchmarkLocation(veh)
    if benchmark.returnX == 0.0 and benchmark.returnY == 0.0 and benchmark.returnZ == 0.0 then
        return
    end

    local ped = PlayerPedId()
    local returnHeading = benchmark.returnHeading or 0.0

    if veh ~= 0 and DoesEntityExist(veh) then
        if GetPedInVehicleSeat(veh, -1) ~= ped then
            SetPedIntoVehicle(ped, veh, -1)
        end
        SetEntityCoordsNoOffset(veh, benchmark.returnX, benchmark.returnY, benchmark.returnZ, false, false, false)
        SetEntityHeading(veh, returnHeading)
        SetVehicleOnGroundProperly(veh)
        SetEntityVelocity(veh, 0.0, 0.0, 0.0)
    else
        SetEntityCoordsNoOffset(ped, benchmark.returnX, benchmark.returnY, benchmark.returnZ, false, false, false)
        SetEntityHeading(ped, returnHeading)
    end
end

local function showBenchmarkMessage(text, durationMs)
    BeginTextCommandPrint('STRING')
    AddTextComponentSubstringPlayerName(tostring(text or 'Benchmark update'))
    EndTextCommandPrint(durationMs or 3000, true)
end

local function getCurrentBenchmarkTarget()
    if not benchmark.active then
        return nil
    end
    if benchmark.phase == 'run' then
        local node = benchmark.routePoints[benchmark.routeIndex]
        return node and node.pos or benchmark.endPos
    end
    if benchmark.phase == 'brake' and benchmark.endPos then
        return benchmark.endPos
    end
    if benchmark.checkpointIndex <= #benchmark.checkpoints then
        return benchmark.checkpoints[benchmark.checkpointIndex]
    end
    return nil
end

local function updateBenchmarkRouteBlip()
    local target = getCurrentBenchmarkTarget()
    if not target then
        if benchmarkBlip ~= 0 and DoesBlipExist(benchmarkBlip) then
            RemoveBlip(benchmarkBlip)
        end
        benchmarkBlip = 0
        return
    end

    if benchmarkBlip ~= 0 and DoesBlipExist(benchmarkBlip) then
        RemoveBlip(benchmarkBlip)
    end

    benchmarkBlip = AddBlipForCoord(target.x, target.y, target.z)
    SetBlipSprite(benchmarkBlip, 38)
    SetBlipScale(benchmarkBlip, 0.85)
    SetBlipColour(benchmarkBlip, 3)
    SetBlipRoute(benchmarkBlip, true)
    BeginTextCommandSetBlipName('STRING')
    AddTextComponentSubstringPlayerName(benchmark.phase == 'run' and 'Benchmark Maneuver Point' or 'Benchmark Brake Zone')
    EndTextCommandSetBlipName(benchmarkBlip)
end

local function buildAirportBenchmarkRoute(startPos)
    local direction = headingToDirection(benchmark.runHeading)
    local right = vector3(direction.y, -direction.x, 0.0)

    local p1 = vector3(startPos.x + (direction.x * 220.0), startPos.y + (direction.y * 220.0), startPos.z)
    local p2 = vector3(p1.x + (right.x * 140.0), p1.y + (right.y * 140.0), startPos.z)
    local p3 = vector3(p2.x + (direction.x * 180.0), p2.y + (direction.y * 180.0), startPos.z)
    local p4 = vector3(p3.x - (right.x * 160.0), p3.y - (right.y * 160.0), startPos.z)
    local p5 = vector3(p4.x + (direction.x * 220.0), p4.y + (direction.y * 220.0), startPos.z)

    return {
        { pos = p1, maneuver = 'hard_right' },
        { pos = p2, maneuver = 'handbrake_left' },
        { pos = p3, maneuver = 'hard_left' },
        { pos = p4, maneuver = 'handbrake_right' },
        { pos = p5, maneuver = nil },
    }
end

local function startAutoDriveToEnd(veh, target, speedKmh)
    local ped = PlayerPedId()
    if veh == 0 or not DoesEntityExist(veh) or not target then
        return
    end
    SetDriverAbility(ped, 1.0)
    SetDriverAggressiveness(ped, 1.0)
    SetDriveTaskDrivingStyle(ped, BENCHMARK_DRIVE_STYLE)
    TaskVehicleDriveToCoordLongrange(ped, veh, target.x, target.y, target.z, (speedKmh or 160.0) / 3.6, BENCHMARK_DRIVE_STYLE, 3.0)
end

local function beginManeuver(veh, maneuver)
    if veh == 0 or not DoesEntityExist(veh) then
        return
    end

    local now = GetGameTimer()
    benchmark.maneuverUntil = 0
    benchmark.maneuverSteering = 0.0
    benchmark.maneuverHandbrake = false

    if maneuver == 'hard_left' then
        benchmark.maneuverUntil = now + 700
        benchmark.maneuverSteering = -35.0
        SetVehicleForwardSpeed(veh, math.min(GetEntitySpeed(veh), 38.0))
        showBenchmarkMessage('AI hard left turn.', 1200)
    elseif maneuver == 'hard_right' then
        benchmark.maneuverUntil = now + 700
        benchmark.maneuverSteering = 35.0
        SetVehicleForwardSpeed(veh, math.min(GetEntitySpeed(veh), 38.0))
        showBenchmarkMessage('AI hard right turn.', 1200)
    elseif maneuver == 'handbrake_left' then
        benchmark.maneuverUntil = now + 1200
        benchmark.maneuverSteering = -48.0
        benchmark.maneuverHandbrake = true
        SetVehicleForwardSpeed(veh, math.min(GetEntitySpeed(veh), 32.0))
        showBenchmarkMessage('AI handbrake left turn.', 1300)
    elseif maneuver == 'handbrake_right' then
        benchmark.maneuverUntil = now + 1200
        benchmark.maneuverSteering = 48.0
        benchmark.maneuverHandbrake = true
        SetVehicleForwardSpeed(veh, math.min(GetEntitySpeed(veh), 32.0))
        showBenchmarkMessage('AI handbrake right turn.', 1300)
    end
end

local function updateManeuverState(veh)
    if benchmark.maneuverUntil <= 0 then
        return
    end

    local now = GetGameTimer()
    if now <= benchmark.maneuverUntil then
        SetVehicleSteeringAngle(veh, benchmark.maneuverSteering)
        if benchmark.maneuverHandbrake then
            SetVehicleHandbrake(veh, true)
        end
        return
    end

    SetVehicleSteeringAngle(veh, 0.0)
    if benchmark.maneuverHandbrake then
        SetVehicleHandbrake(veh, false)
    end
    benchmark.maneuverUntil = 0
    benchmark.maneuverSteering = 0.0
    benchmark.maneuverHandbrake = false
end

local function getBenchmarkPayload(veh, pos)
    local now = GetGameTimer()
    local elapsedSec = math.max(0.0, (now - benchmark.startTime) / 1000.0)
    local speedKmh = GetEntitySpeed(veh) * 3.6
    return {
        active = benchmark.active,
        elapsedSec = elapsedSec,
        speedKmh = speedKmh,
        distanceM = benchmark.distance,
        checkpointIndex = math.max(0, benchmark.routeIndex - 1),
        checkpointTotal = #benchmark.routePoints,
        accel0to100Sec = benchmark.accel0to100 or 0.0,
        brake100to20M = benchmark.brake100to20 or 0.0,
    }
end

local function stopBenchmark(completed)
    if not benchmark.active then
        return
    end
    local veh = benchmark.vehicle
    local pos = benchmark.lastPos or (veh ~= 0 and DoesEntityExist(veh) and GetEntityCoords(veh) or vector3(0.0, 0.0, 0.0))
    local payload = getBenchmarkPayload((veh ~= 0 and DoesEntityExist(veh) and veh) or PlayerPedId(), pos)
    SendNUIMessage({
        type = completed and 'benchmarkComplete' or 'benchmarkUpdate',
        data = payload,
    })
    if completed then
        showBenchmarkMessage(('Benchmark complete | t %.2fs | 0-100 %.2fs | brake %.1fm'):format(
            payload.elapsedSec or 0.0,
            payload.accel0to100Sec or 0.0,
            payload.brake100to20M or 0.0
        ), 5500)
    else
        showBenchmarkMessage('Benchmark stopped.', 2500)
    end
    setBenchmarkVehicleProtection(veh, false)
    setBenchmarkPedProtection(false)
    returnFromBenchmarkLocation(veh)
    clearBenchmarkState()
end

local function startBenchmark()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh == 0 or GetPedInVehicleSeat(veh, -1) ~= ped then
        return false
    end

    local returnPos = GetEntityCoords(veh)
    local returnHeading = GetEntityHeading(veh)
    local maxFlatVel = GetVehicleHandlingFloat(veh, 'CHandlingData', 'fInitialDriveMaxFlatVel')
    local targetSpeed = math.min(260.0, math.max(130.0, (maxFlatVel or 160.0) * 1.05))

    clearBenchmarkState()

    if not teleportVehicleToBenchmarkStart(veh) then
        return false
    end

    local pos = GetEntityCoords(veh)
    benchmark.active = true
    benchmark.vehicle = veh
    benchmark.startTime = GetGameTimer()
    benchmark.startPos = pos
    benchmark.returnX = returnPos.x + 0.0
    benchmark.returnY = returnPos.y + 0.0
    benchmark.returnZ = returnPos.z + 0.0
    benchmark.returnHeading = returnHeading
    benchmark.runHeading = AIRPORT_BENCHMARK_HEADING
    benchmark.routePoints = buildAirportBenchmarkRoute(pos)
    benchmark.routeIndex = 1
    benchmark.endPos = benchmark.routePoints[#benchmark.routePoints].pos
    benchmark.lastPos = pos
    benchmark.checkpoints = { benchmark.endPos }
    benchmark.phase = 'run'
    benchmark.phaseStartTime = benchmark.startTime
    benchmark.targetSpeedKmh = targetSpeed

    setBenchmarkVehicleProtection(veh, true)
    setBenchmarkPedProtection(true)

    startAutoDriveToEnd(veh, benchmark.routePoints[benchmark.routeIndex].pos, benchmark.targetSpeedKmh)
    updateBenchmarkRouteBlip()
    showBenchmarkMessage(('Teleported to LSIA runway. Aggressive AI course started with hard and handbrake turns at %.0f km/h.'):format(benchmark.targetSpeedKmh), 4500)

    return true
end

-- ─── Auto-apply on enter ──────────────────────────────────────────────────────
local function findPresetForModel(modelKey)
    -- New format: entries stored by custom name with _modelKey inside
    for _, entry in pairs(savedData) do
        if type(entry) == 'table' and entry._modelKey == modelKey then
            return entry
        end
    end
    -- Legacy format: direct model-hash key without _modelKey field (old saves)
    local legacy = savedData[modelKey]
    if type(legacy) == 'table' and not legacy._modelKey then
        return legacy
    end
    return nil
end

if Config.AutoApplyOnEnter then
    CreateThread(function()
        while true do
            Wait(Config.ReapplyInterval)
            local ped = PlayerPedId()
            local veh = GetVehiclePedIsIn(ped, false)
            if veh ~= 0 then
                local modelKey = tostring(GetEntityModel(veh))
                local preset   = findPresetForModel(modelKey)
                if preset then
                    applyHandling(veh, preset)
                end
            end
        end
    end)
end

-- ─── NUI open/close ──────────────────────────────────────────────────────────
local function openEditor()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh == 0 then
        SendNUIMessage({ type = 'open', fields = HANDLING_FIELDS, current = {}, modelName = 'NO VEHICLE', savedMap = savedData, upgrades = nil })
    else
        local activeFields = getHandlingFieldsForVehicle(veh)
        currentVeh = veh
        local model    = GetEntityModel(veh)
        local modelKey = tostring(model)
        local current  = readAllFields(veh, activeFields)
        local displayName = GetDisplayNameFromVehicleModel(model)
        local vehicleClass = getVehicleClassInfo(veh)
        local upgrades = getVehicleUpgradeInfo(veh)
        SendNUIMessage({
            type      = 'open',
            fields    = activeFields,
            current   = current,
            modelName = displayName,
            modelKey  = modelKey,
            vehicleClass = vehicleClass,
            upgrades = upgrades,
            savedMap  = savedData,
        })
    end
    SetNuiFocus(true, true)
    isOpen = true
end

local function closeEditor()
    SetNuiFocus(false, false)
    isOpen = false
    SendNUIMessage({ type = 'close' })
end

-- ─── Command ──────────────────────────────────────────────────────────────────
-- Permission is checked server-side; IsPlayerAceAllowed is a server-only native.
RegisterCommand(Config.OpenCommand, function()
    if isOpen then
        closeEditor()
    else
        TriggerServerEvent('dg-handlingcontrol:server:requestOpen')
    end
end, false)

-- Server grants/denies the open request
RegisterNetEvent('dg-handlingcontrol:client:openGranted')
AddEventHandler('dg-handlingcontrol:client:openGranted', function()
    openEditor()
end)

-- ─── NUI Callbacks ───────────────────────────────────────────────────────────

-- Live-apply a single field change
RegisterNUICallback('applyField', function(data, cb)
    local veh = GetVehiclePedIsIn(PlayerPedId(), false)
    if veh ~= 0 and Config.LivePreview then
        local f = data.field
        local val = data.value
        if data.isInt then
            SetVehicleHandlingInt(veh, 'CHandlingData', f, math.floor(val))
        else
            SetVehicleHandlingFloat(veh, 'CHandlingData', f, val + 0.0)
        end
    end
    cb('ok')
end)

-- Apply a full handling snapshot (when loading a preset)
RegisterNUICallback('applyAll', function(data, cb)
    local veh = GetVehiclePedIsIn(PlayerPedId(), false)
    if veh ~= 0 then
        applyHandling(veh, data.handling)
    end
    cb('ok')
end)

-- Read current live values from vehicle (refresh)
RegisterNUICallback('readFields', function(_, cb)
    local veh = GetVehiclePedIsIn(PlayerPedId(), false)
    if veh ~= 0 then
        currentVeh = veh
        cb(readAllFields(veh))
    else
        cb({})
    end
end)

RegisterNUICallback('getVehicleUpgrades', function(_, cb)
    local veh = GetVehiclePedIsIn(PlayerPedId(), false)
    if veh ~= 0 then
        cb({ ok = true, upgrades = getVehicleUpgradeInfo(veh) })
    else
        cb({ ok = false })
    end
end)

-- Save preset for a model to server
RegisterNUICallback('saveHandling', function(data, cb)
    local presetName = data.presetName
    local modelKey   = data.modelKey
    local handling   = data.handling
    if type(presetName) ~= 'string' or presetName == '' then cb('err') return end
    -- Store locally with _modelKey so auto-apply can find it by vehicle model
    local entry = { _modelKey = modelKey }
    for k, v in pairs(handling) do entry[k] = v end
    savedData[presetName] = entry
    TriggerServerEvent('dg-handlingcontrol:server:save', presetName, modelKey, handling)
    cb('ok')
end)

-- Delete a saved preset
RegisterNUICallback('deleteHandling', function(data, cb)
    local presetName = data.modelKey  -- JS still sends this field as 'modelKey'
    savedData[presetName] = nil
    TriggerServerEvent('dg-handlingcontrol:server:delete', presetName)
    cb('ok')
end)

RegisterNUICallback('requestAudit', function(_, cb)
    cb({
        audit = auditData,
        restore = restoreData,
    })
    TriggerServerEvent('dg-handlingcontrol:server:requestAudit')
end)

RegisterNUICallback('restorePreset', function(data, cb)
    local presetName = type(data.presetName) == 'string' and data.presetName or ''
    local slotIndex = tonumber(data.slotIndex) or 1
    if presetName == '' then
        cb({ ok = false, reason = 'missing_preset' })
        return
    end

    local bucket = restoreData[presetName]
    if type(bucket) ~= 'table' or #bucket == 0 then
        cb({ ok = false, reason = 'no_restore_points' })
        return
    end

    slotIndex = math.max(1, math.floor(slotIndex))
    if slotIndex > #bucket then
        slotIndex = 1
    end

    local point = bucket[slotIndex]
    if type(point) ~= 'table' or type(point.handling) ~= 'table' then
        cb({ ok = false, reason = 'invalid_restore_data' })
        return
    end

    savedData[presetName] = point.handling
    TriggerServerEvent('dg-handlingcontrol:server:restore', presetName, slotIndex)
    cb({
        ok = true,
        presetName = presetName,
        handling = point.handling,
        modelKey = point.modelKey or point.handling._modelKey or '',
    })
end)

-- Reset vehicle handling to game defaults (re-applies original model data)
RegisterNUICallback('resetToDefault', function(_, cb)
    local veh = GetVehiclePedIsIn(PlayerPedId(), false)
    if veh ~= 0 then
        -- Force GTA to reload model's default handling by toggling a native
        local model = GetEntityModel(veh)
        local coords = GetEntityCoords(veh)
        local heading = GetEntityHeading(veh)
        -- Fastest approach: just set all fields back by requesting from original model
        -- We do this by creating a temp vehicle, reading, applying, then deleting
        local tempVeh = CreateVehicle(model, coords.x + 100, coords.y + 100, coords.z, heading, false, true)
        if DoesEntityExist(tempVeh) then
            local defaults = readAllFields(tempVeh)
            DeleteVehicle(tempVeh)
            applyHandling(veh, defaults)
            cb(defaults)
        else
            cb({})
        end
    else
        cb({})
    end
end)

RegisterNUICallback('benchmarkStart', function(_, cb)
    local ok = startBenchmark()
    if ok then
        closeEditor()
    end
    cb({ ok = ok })
end)

RegisterNUICallback('benchmarkStop', function(_, cb)
    stopBenchmark(false)
    cb({ ok = true })
end)

-- Close NUI
RegisterNUICallback('close', function(_, cb)
    closeEditor()
    cb('ok')
end)

-- ─── Server → Client: receive saved data on resource start ───────────────────
RegisterNetEvent('dg-handlingcontrol:client:loadSaved')
AddEventHandler('dg-handlingcontrol:client:loadSaved', function(data, restore, audit)
    savedData = data or {}
    restoreData = restore or {}
    auditData = audit or {}
end)

RegisterNetEvent('dg-handlingcontrol:client:auditData')
AddEventHandler('dg-handlingcontrol:client:auditData', function(audit, restore)
    auditData = audit or {}
    restoreData = restore or {}
end)

-- Request saved data when we connect / resource starts
AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        TriggerServerEvent('dg-handlingcontrol:server:requestSaved')
    end
end)

-- Also request on initial spawn
CreateThread(function()
    Wait(3000)
    TriggerServerEvent('dg-handlingcontrol:server:requestSaved')
end)

CreateThread(function()
    while true do
        if not benchmark.active then
            Wait(250)
        else
            Wait(100)
            local ped = PlayerPedId()
            local veh = GetVehiclePedIsIn(ped, false)
            if veh == 0 or veh ~= benchmark.vehicle or not DoesEntityExist(veh) then
                stopBenchmark(false)
                goto continue
            end

            -- Re-apply protection every tick in case other scripts/natives reset it.
            setBenchmarkVehicleProtection(veh, true)
            setBenchmarkPedProtection(true)

            DisableControlAction(0, 71, true)
            DisableControlAction(0, 72, true)
            DisableControlAction(0, 59, true)
            DisableControlAction(0, 60, true)
            DisableControlAction(0, 75, true)
            SetVehicleDensityMultiplierThisFrame(0.0)
            SetRandomVehicleDensityMultiplierThisFrame(0.0)
            SetParkedVehicleDensityMultiplierThisFrame(0.0)
            SetPedDensityMultiplierThisFrame(0.0)
            SetScenarioPedDensityMultiplierThisFrame(0.0, 0.0)

            local pos = GetEntityCoords(veh)
            if benchmark.lastPos then
                benchmark.distance = benchmark.distance + #(pos - benchmark.lastPos)
            end
            benchmark.lastPos = pos

            local speedKmh = GetEntitySpeed(veh) * 3.6
            if not benchmark.accel0to100 and speedKmh >= 100.0 then
                benchmark.accel0to100 = (GetGameTimer() - benchmark.startTime) / 1000.0
                benchmark.brakeStartDist = benchmark.distance
            end
            if benchmark.brakeStartDist and not benchmark.brake100to20 and speedKmh <= 20.0 then
                benchmark.brake100to20 = math.max(0.0, benchmark.distance - benchmark.brakeStartDist)
            end

            if benchmark.phase == 'run' then
                local node = benchmark.routePoints[benchmark.routeIndex]
                if node and #(pos - node.pos) <= 18.0 then
                    beginManeuver(veh, node.maneuver)
                    benchmark.routeIndex = benchmark.routeIndex + 1
                    if benchmark.routeIndex <= #benchmark.routePoints then
                        local nextNode = benchmark.routePoints[benchmark.routeIndex]
                        startAutoDriveToEnd(veh, nextNode.pos, benchmark.targetSpeedKmh)
                    else
                        benchmark.phase = 'brake'
                        benchmark.phaseStartTime = GetGameTimer()
                        if not benchmark.brakeStartDist then
                            benchmark.brakeStartDist = benchmark.distance
                        end
                        TaskVehicleTempAction(ped, veh, 24, 3000)
                        showBenchmarkMessage('Final point reached. AI braking for distance capture...', 3200)
                    end
                    updateBenchmarkRouteBlip()
                end
            end

            updateManeuverState(veh)

            if benchmark.phase == 'brake' then
                local brakeElapsed = (GetGameTimer() - benchmark.phaseStartTime) / 1000.0
                if benchmark.brake100to20 then
                    stopBenchmark(true)
                    goto continue
                end
                if brakeElapsed >= 4.5 then
                    stopBenchmark(true)
                    goto continue
                end
            end

            local target = getCurrentBenchmarkTarget()
            if target then
                DrawMarker(1, target.x, target.y, target.z - 1.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 6.0, 6.0, 1.5, 80, 168, 232, 180, false, true, 2, false, nil, nil, false)
            end

            SendNUIMessage({
                type = 'benchmarkUpdate',
                data = getBenchmarkPayload(veh, pos),
            })
        end
        ::continue::
    end
end)

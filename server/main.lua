-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║                  DG HANDLING CONTROL - SERVER                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

local SAVE_FILE = 'data/saved_handlings.json'
local savedHandlings = {}

-- ─── Load from disk ───────────────────────────────────────────────────────────
local function loadFromDisk()
    local raw = LoadResourceFile(GetCurrentResourceName(), SAVE_FILE)
    if raw and raw ~= '' then
        local ok, parsed = pcall(json.decode, raw)
        if ok and type(parsed) == 'table' then
            savedHandlings = parsed
            print(('[DG-HandlingControl] Loaded %d saved handling presets.'):format(#(function() local c=0 for _ in pairs(parsed) do c=c+1 end return {} end)() ))
        end
    end
end

local function saveToDisk()
    local ok, encoded = pcall(json.encode, savedHandlings)
    if ok then
        SaveResourceFile(GetCurrentResourceName(), SAVE_FILE, encoded, -1)
    else
        print('^1[DG-HandlingControl] ERROR: Failed to encode handling data.^7')
    end
end

-- ─── Permission check ─────────────────────────────────────────────────────────
local function hasPermission(src)
    if not Config.RequirePermission then return true end
    return IsPlayerAceAllowed(tostring(src), Config.AcePermission)
end

-- ─── Events ───────────────────────────────────────────────────────────────────
RegisterNetEvent('dg-handlingcontrol:server:requestSaved')
AddEventHandler('dg-handlingcontrol:server:requestSaved', function()
    local src = source
    TriggerClientEvent('dg-handlingcontrol:client:loadSaved', src, savedHandlings)
end)

RegisterNetEvent('dg-handlingcontrol:server:save')
AddEventHandler('dg-handlingcontrol:server:save', function(presetName, modelKey, handling)
    local src = source
    if not hasPermission(src) then
        print(('[DG-HandlingControl] BLOCKED: Player %s tried to save handling without permission.'):format(src))
        return
    end
    if type(presetName) ~= 'string' or presetName == '' then return end
    if type(modelKey)   ~= 'string' then return end
    if type(handling)   ~= 'table'  then return end
    -- Sanitise: only numeric values; inject _modelKey for auto-apply lookup
    local clean = { _modelKey = modelKey }
    for k, v in pairs(handling) do
        if type(k) == 'string' and k ~= '_modelKey' and type(v) == 'number' then
            clean[k] = v
        end
    end
    savedHandlings[presetName] = clean
    saveToDisk()
    -- Broadcast to all clients so AutoApply works server-wide
    TriggerClientEvent('dg-handlingcontrol:client:loadSaved', -1, savedHandlings)
    print(('[DG-HandlingControl] Player %s saved preset "%s" for model %s'):format(src, presetName, modelKey))
end)

RegisterNetEvent('dg-handlingcontrol:server:delete')
AddEventHandler('dg-handlingcontrol:server:delete', function(modelKey)
    local src = source
    if not hasPermission(src) then return end
    if type(modelKey) ~= 'string' then return end
    savedHandlings[modelKey] = nil
    saveToDisk()
    TriggerClientEvent('dg-handlingcontrol:client:loadSaved', -1, savedHandlings)
    print(('[DG-HandlingControl] Player %s deleted handling preset for: %s'):format(src, modelKey))
end)

-- ─── Open request ───────────────────────────────────────────────────────────────
RegisterNetEvent('dg-handlingcontrol:server:requestOpen')
AddEventHandler('dg-handlingcontrol:server:requestOpen', function()
    local src = source
    if hasPermission(src) then
        TriggerClientEvent('dg-handlingcontrol:client:openGranted', src)
    else
        print(('[DG-HandlingControl] DENIED: Player %s (name: %s) lacks ace permission "%s". Grant it in server.cfg or set Config.RequirePermission = false.'):format(src, GetPlayerName(src) or '?', Config.AcePermission))
    end
end)

-- ─── Startup ──────────────────────────────────────────────────────────────────
AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        loadFromDisk()
    end
end)

loadFromDisk()

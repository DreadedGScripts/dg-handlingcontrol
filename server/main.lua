-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║                  DG HANDLING CONTROL - SERVER                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

local SAVE_FILE = 'data/saved_handlings.json'
local RESTORE_FILE = 'data/restore_points.json'
local AUDIT_FILE = 'data/audit_log.json'

local savedHandlings = {}
local restorePoints = {}
local auditEntries = {}

local function tableCount(t)
    local c = 0
    for _ in pairs(t or {}) do
        c = c + 1
    end
    return c
end

local function loadJsonFile(path)
    local raw = LoadResourceFile(GetCurrentResourceName(), path)
    if not raw or raw == '' then
        return {}
    end
    local ok, parsed = pcall(json.decode, raw)
    if ok and type(parsed) == 'table' then
        return parsed
    end
    return {}
end

local function saveJsonFile(path, payload)
    local ok, encoded = pcall(json.encode, payload)
    if ok then
        SaveResourceFile(GetCurrentResourceName(), path, encoded, -1)
    else
        print(('^1[DG-HandlingControl] ERROR: Failed to encode %s.^7'):format(path))
    end
end

local function addAudit(action, src, presetName, modelKey, meta)
    local entry = {
        ts = os.time(),
        action = tostring(action or 'unknown'),
        source = tonumber(src) or 0,
        player = src and GetPlayerName(src) or 'system',
        presetName = presetName and tostring(presetName) or '',
        modelKey = modelKey and tostring(modelKey) or '',
        meta = type(meta) == 'table' and meta or {},
    }
    table.insert(auditEntries, 1, entry)
    if #auditEntries > 500 then
        table.remove(auditEntries)
    end
end

local function pushRestorePoint(presetName, modelKey, handling, src)
    if type(presetName) ~= 'string' or presetName == '' then
        return
    end
    if type(handling) ~= 'table' then
        return
    end

    local bucket = restorePoints[presetName]
    if type(bucket) ~= 'table' then
        bucket = {}
        restorePoints[presetName] = bucket
    end

    table.insert(bucket, 1, {
        ts = os.time(),
        source = tonumber(src) or 0,
        player = src and GetPlayerName(src) or 'system',
        modelKey = tostring(modelKey or ''),
        handling = handling,
    })

    if #bucket > 5 then
        table.remove(bucket)
    end
end

local function saveAll()
    saveJsonFile(SAVE_FILE, savedHandlings)
    saveJsonFile(RESTORE_FILE, restorePoints)
    saveJsonFile(AUDIT_FILE, auditEntries)
end

local function broadcastState(target)
    TriggerClientEvent('dg-handlingcontrol:client:loadSaved', target or -1, savedHandlings, restorePoints, auditEntries)
end

-- ─── Load from disk ───────────────────────────────────────────────────────────
local function loadFromDisk()
    savedHandlings = loadJsonFile(SAVE_FILE)
    restorePoints = loadJsonFile(RESTORE_FILE)
    auditEntries = loadJsonFile(AUDIT_FILE)
    print(('[DG-HandlingControl] Loaded %d presets, %d restore buckets, %d audit entries.'):format(
        tableCount(savedHandlings),
        tableCount(restorePoints),
        #auditEntries
    ))
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
    broadcastState(src)
end)

RegisterNetEvent('dg-handlingcontrol:server:requestAudit')
AddEventHandler('dg-handlingcontrol:server:requestAudit', function()
    local src = source
    TriggerClientEvent('dg-handlingcontrol:client:auditData', src, auditEntries, restorePoints)
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

    local previous = savedHandlings[presetName]
    if type(previous) == 'table' then
        pushRestorePoint(presetName, previous._modelKey or modelKey, previous, src)
    end

    savedHandlings[presetName] = clean
    addAudit('save', src, presetName, modelKey, {
        fieldCount = tableCount(clean),
        hadPrevious = previous ~= nil,
    })
    saveAll()
    broadcastState(-1)
    print(('[DG-HandlingControl] Player %s saved preset "%s" for model %s'):format(src, presetName, modelKey))
end)

RegisterNetEvent('dg-handlingcontrol:server:delete')
AddEventHandler('dg-handlingcontrol:server:delete', function(modelKey)
    local src = source
    if not hasPermission(src) then return end
    if type(modelKey) ~= 'string' then return end

    local previous = savedHandlings[modelKey]
    if type(previous) == 'table' then
        pushRestorePoint(modelKey, previous._modelKey or '', previous, src)
    end

    savedHandlings[modelKey] = nil
    addAudit('delete', src, modelKey, previous and previous._modelKey or '', {
        hadPrevious = previous ~= nil,
    })
    saveAll()
    broadcastState(-1)
    print(('[DG-HandlingControl] Player %s deleted handling preset for: %s'):format(src, modelKey))
end)

RegisterNetEvent('dg-handlingcontrol:server:restore')
AddEventHandler('dg-handlingcontrol:server:restore', function(presetName, slotIndex)
    local src = source
    if not hasPermission(src) then
        return
    end
    if type(presetName) ~= 'string' or presetName == '' then
        return
    end

    local bucket = restorePoints[presetName]
    if type(bucket) ~= 'table' or #bucket == 0 then
        return
    end

    local index = tonumber(slotIndex) or 1
    index = math.max(1, math.floor(index))
    if index > #bucket then
        index = 1
    end

    local point = bucket[index]
    if type(point) ~= 'table' or type(point.handling) ~= 'table' then
        return
    end

    local current = savedHandlings[presetName]
    if type(current) == 'table' then
        pushRestorePoint(presetName, current._modelKey or '', current, src)
    end

    savedHandlings[presetName] = point.handling
    addAudit('restore', src, presetName, point.modelKey or '', {
        slot = index,
    })
    saveAll()
    broadcastState(-1)
    print(('[DG-HandlingControl] Player %s restored preset "%s" from slot %s'):format(src, presetName, index))
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

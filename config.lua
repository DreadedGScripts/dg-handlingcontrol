-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║                   DG HANDLING CONTROL - CONFIGURATION                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

Config = {}

-- Command to open the handling editor (requires ace permission below)
Config.OpenCommand = 'handlingeditor'

-- Ace permission required to use the editor.
-- Grant it in your server.cfg:
--   add_ace group.admin dg-handlingcontrol.use allow
Config.AcePermission = 'dg-handlingcontrol.use'

-- Set to false to allow ALL players to open the editor (useful for testing).
-- Set to true to enforce the AcePermission above.
Config.RequirePermission = false

-- Where saved handling presets are stored on disk (relative to resource root)
Config.SaveFile = 'data/saved_handlings.json'

-- Whether changes apply instantly (live preview) while sliders are moved
Config.LivePreview = true

-- Whether to automatically re-apply the saved handling for a vehicle model
-- whenever a player enters that vehicle model again
Config.AutoApplyOnEnter = true

-- How often (ms) to re-apply handling to the local vehicle when AutoApply is on
-- (GTA can reset handling on model change / stream events)
Config.ReapplyInterval = 2000

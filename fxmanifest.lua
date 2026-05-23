fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'DG-Scripts'
description 'In-game vehicle handling editor — modify, preview, and save custom handling for any vehicle.'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
}

shared_scripts {
    'config.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

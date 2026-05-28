# Suricata Bot

Telegram Bot for suricata alerts
via native telegramm api with auto cleanup and safe-Fallback via second login.

Node.js 25 is required.

## Installation

The installation is realy easy, just clone the repo and install the dependencies: then make a ENV file with the following content:
```env
# Suricata Fast.log path
fastFilePath = /PATHTOSURICATA/suricata/fast.log

# Telegram Bot Token
telegramToken = YOUR_TELEGRAM_BOT_TOKEN

# Telegram Chat ID
telegramChatId = YOUR_TELEGRAM_CHAT_ID
```

then you just need to add the correct user rights (Best would be setfacl -m u:USER:r /PATHTOSURICATA/suricata/fast.log) and start the bot with `node index.js` or `npm start`

### tipp

you should set up a systemd service 
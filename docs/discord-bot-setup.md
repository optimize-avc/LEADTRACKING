# Discord Bot Setup Guide

This guide walks you through creating a Discord bot and connecting it to SalesTracker. Don't worry if you've never created a Discord bot before — we'll explain every step!

---

## What You'll Need

- A Discord account
- Admin access to a Discord server (or permission to add bots)
- About 10 minutes

---

## Step 1: Create a Discord Application

1. **Go to the Discord Developer Portal**  
   Open your browser and navigate to: https://discord.com/developers/applications

2. **Log in with Discord**  
   If prompted, sign in with your Discord account.

3. **Click "New Application"**  
   You'll see a blue button in the top-right corner.
   
   > 📸 *You should see a list of your applications (probably empty) with a "New Application" button.*

4. **Name your application**  
   Give it a name like "SalesTracker Bot" or "[Your Company] Lead Bot".
   
5. **Accept the Terms of Service**  
   Check the box and click **Create**.
   
   > 📸 *You should now see your application's General Information page with settings like Application ID and Public Key.*

---

## Step 2: Create a Bot User

1. **Go to the "Bot" section**  
   In the left sidebar, click on **Bot**.

2. **Click "Add Bot"** (if prompted)  
   Some newer applications auto-create a bot. If you see a "Build-A-Bot" section, click **Add Bot** and confirm.
   
   > 📸 *You should see a Bot section showing your bot's username and an option to reset the token.*

3. **Configure Bot Settings**  
   Scroll down and ensure these settings are configured:
   
   - ✅ **Public Bot**: Toggle OFF (only you should be able to add this bot)
   - ✅ **Requires OAuth2 Code Grant**: Leave OFF
   - ✅ **Message Content Intent**: Leave OFF (not needed)
   - ✅ **Server Members Intent**: Leave OFF (not needed)
   - ✅ **Presence Intent**: Leave OFF (not needed)

---

## Step 3: Get Your Bot Token

> ⚠️ **IMPORTANT: Keep your bot token SECRET!** Anyone with this token can control your bot. Never share it publicly, commit it to Git, or post it in Discord.

1. **Click "Reset Token"**  
   In the Bot section, you'll see a **Token** field with a "Reset Token" button.

2. **Confirm the reset**  
   Discord will ask you to confirm. Click **Yes, do it!**

3. **Copy the token immediately**  
   The token will only be shown once! Click **Copy** to save it to your clipboard.

4. **Store it safely**  
   Paste it somewhere secure (password manager, secure notes, etc.). You'll need this for SalesTracker.
   
   > 💡 *The token is a long random string that grants access to your bot - never share it publicly!*

---

## Step 4: Get Your Client ID (Application ID)

1. **Go to "General Information"**  
   Click **General Information** in the left sidebar (or **OAuth2**).

2. **Copy the Application ID**  
   Look for **Application ID** (also called Client ID). Click **Copy**.
   
   > 📸 *The Application ID is a long number like: `1464013717522874419`*

3. **Save this for later**  
   You'll need both the Client ID and Bot Token for SalesTracker.

---

## Step 5: Understanding Bot Permissions

SalesTracker needs these permissions to work properly:

| Permission | Why It's Needed |
|------------|-----------------|
| **Manage Channels** | To see your server's channel list |
| **Send Messages** | To post lead notifications and updates |
| **Embed Links** | To send rich formatted messages with lead details |
| **Read Message History** | To track context in notification channels |

**Permission Integer:** `2147485696`

> 💡 SalesTracker automatically includes these permissions when you connect your Discord server through the app.

---

## Step 6: Connect Discord in SalesTracker

1. **Log in to SalesTracker**  
   Go to your SalesTracker dashboard.

2. **Navigate to Settings → Bot Studio**  
   Click **Settings** in the sidebar, then **Bot Studio**.

3. **Click "Connect Discord"**  
   You'll see a Discord Connection card with a blue **Connect Discord** button.

4. **Authorize the bot**  
   A Discord popup will appear asking you to:
   - Select which server to add the bot to
   - Review the permissions being requested
   
   > 📸 *You'll see a dropdown to select your server and a list of permissions the bot needs.*

5. **Click "Authorize"**  
   After authorizing, you'll be redirected back to SalesTracker.

6. **Configure Channel Mapping**  
   Once connected, you'll see a **Channel Mapping** section. Select which channels should receive different notification types:
   
   - **New Leads**: Where new lead discoveries are posted
   - **Closed Won**: Celebrate your wins!
   - **Lead Triage**: Leads needing review or assignment
   - **Daily Digest**: Daily pipeline summary

7. **Save your settings**  
   Click **Save Channel Mapping** to activate notifications.

---

## Step 7: Add Your Bot Token to SalesTracker

> 🔧 **For Self-Hosted / Admin Users Only**

If you're self-hosting SalesTracker or are the platform administrator, add these environment variables:

```env
# Discord Configuration
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_CLIENT_SECRET=your_oauth2_secret_here
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_REDIRECT_URI=https://your-app-url.com/api/discord/callback
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_application_id_here
```

---

## Troubleshooting

### Bot isn't showing any channels

**Possible causes:**
1. **Bot not in server** — Make sure you completed the authorization and selected your server.
2. **Missing permissions** — The bot needs "Manage Channels" to see the channel list.
3. **Role hierarchy** — The bot's role must be high enough in the role list to see channels.

**Fix:**
1. Go to your Discord server → Server Settings → Roles
2. Find the SalesTracker bot role and drag it higher in the list
3. Make sure the role has "View Channels" permission

### "Discord bot not configured" error

**Cause:** The bot token isn't set in the environment.

**Fix (for admins):**
1. Make sure `DISCORD_BOT_TOKEN` is set in your environment variables
2. Restart the application after adding the variable

### Bot posts to wrong channel / no notifications

**Possible causes:**
1. Channel mapping not saved
2. Bot lacks "Send Messages" permission in that channel

**Fix:**
1. Go to Settings → Bot Studio
2. Verify channel mapping is set correctly
3. Click "Save Channel Mapping"
4. In Discord, check the channel permissions allow the bot to send messages

### "Invalid OAuth2 redirect_uri" error

**Cause:** The redirect URI doesn't match what's configured in Discord.

**Fix:**
1. Go to Discord Developer Portal → Your App → OAuth2
2. Add your exact callback URL to "Redirects":
   - Development: `http://localhost:3000/api/discord/callback`
   - Production: `https://your-domain.com/api/discord/callback`

### Bot was removed from server

If someone kicks the bot from your Discord server:
1. Go to Settings → Bot Studio in SalesTracker
2. Click **Disconnect** to clear the old connection
3. Click **Connect Discord** to re-authorize

---

## Security Best Practices

### 🔒 Protect Your Bot Token

- **Never share your token** in public channels, screenshots, or code
- **Never commit tokens** to Git repositories
- **Use environment variables** — don't hardcode tokens in source code
- **Rotate if compromised** — if your token leaks, immediately reset it in the Discord Developer Portal

### 🔒 Limit Bot Permissions

- Only grant permissions the bot actually needs
- Use channel-specific overrides if needed
- Review bot permissions regularly

### 🔒 Monitor Bot Activity

- Keep an eye on which channels the bot posts to
- Review the audit log in Discord Server Settings
- Remove the bot if you no longer use SalesTracker

---

## Quick Reference

| Item | Where to Find It |
|------|------------------|
| Bot Token | Discord Developer Portal → Your App → Bot → Reset Token |
| Client ID | Discord Developer Portal → Your App → General Information → Application ID |
| Permission Integer | `2147485696` |
| OAuth2 Scopes | `bot`, `guilds`, `applications.commands` |

---

## Need Help?

If you're still having trouble:
1. Check our [Help Center](https://your-domain.com/help)
2. Contact support at support@your-domain.com
3. Join our Discord community for peer support

---

*Last updated: January 2025*

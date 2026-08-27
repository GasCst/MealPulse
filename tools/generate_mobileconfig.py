#!/usr/bin/env python3
"""
tools/generate_mobileconfig.py
Generates Apple iOS Configuration Profile (.mobileconfig) for 1-click WebClip installation.
"""

import base64
import os
import uuid

def generate_mobileconfig(app_url="https://mealpulse.vercel.app", output_path="public/mealpulse.mobileconfig", icon_path="assets/icona_nuova.png"):
    icon_base64 = ""
    if os.path.exists(icon_path):
        with open(icon_path, "rb") as f:
            icon_base64 = base64.b64encode(f.read()).decode("utf-8")
    
    top_uuid = str(uuid.uuid4()).upper()
    clip_uuid = str(uuid.uuid4()).upper()

    mobileconfig_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadDisplayName</key>
    <string>MealPulse AI</string>
    <key>PayloadDescription</key>
    <string>Installa l'app MealPulse AI sulla schermata Home del tuo iPhone.</string>
    <key>PayloadOrganization</key>
    <string>MealPulse AI</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>{top_uuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadIdentifier</key>
    <string>com.mealpulse.app.ios.webclip</string>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PayloadIdentifier</key>
            <string>com.mealpulse.app.ios.webclip.entry</string>
            <key>PayloadUUID</key>
            <string>{clip_uuid}</string>
            <key>PayloadDisplayName</key>
            <string>MealPulse</string>
            <key>PayloadDescription</key>
            <string>WebClip MealPulse AI Fullscreen</string>
            <key>PayloadOrganization</key>
            <string>MealPulse AI</string>
            <key>URL</key>
            <string>{app_url}</string>
            <key>Label</key>
            <string>MealPulse</string>
            <key>FullScreen</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Precomposed</key>
            <true/>
            <key>Icon</key>
            <data>
{icon_base64}
            </data>
        </dict>
    </array>
</dict>
</plist>
"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(mobileconfig_content)
    
    print(f"[OK] Generated iOS profile: {output_path}")

if __name__ == "__main__":
    generate_mobileconfig()

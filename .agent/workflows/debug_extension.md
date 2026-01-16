---
description: How to load and debug the Firefox Extension
---

1. **Build the Extension**:
   Run the build script to generate the `dist` folder.
   ```bash
   cd extension
   npm run build
   ```

2. **Open Firefox Debugging**:
   Open Firefox and navigate to the URL:
   `about:debugging#/runtime/this-firefox`

3. **Load Temporary Add-on**:
   - Click the **"Load Temporary Add-on..."** button.
   - Navigate to `c:\Users\noore\Projects\web\gemini-3-hackathon\extension\dist`.
   - Select the `manifest.json` file.

4. **Verify**:
   - You should see the extension appear in the list.
   - Open any website (e.g., google.com).
   - You should see the extension in the toolbar or sidebar.

5. **Re-building**:
   - After making changes to code, run `npm run build` again.
   - Click **"Reload"** on the extension entry in the `about:debugging` page.

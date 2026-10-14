# defchat Shop Item Art

Editable SVG preview artwork for all 65 items currently listed in the defchat shop, grouped by category. These are original defchat preview illustrations, not copies of official Discord artwork.

## Browse categories

- [Avatar decorations](./avatar-decorations/)
- [Profile effects](./profile-effects/)
- [Nameplates](./nameplates/)
- [Profile frames](./profile-frames/)
- [Chat effects](./chat-effects/)
- [Emoji packs](./emoji-packs/)

## How to edit

Open any SVG file in GitHub and click the pencil icon to edit its source, or download it and use Figma, Inkscape, or another SVG editor. Change its colors, emoji, shapes, or label, then commit the change. Keep the same filename to replace an asset in place.

The [manifest](./manifest.json) maps shop item names and categories to their asset paths.

**Note:** These assets are a separate artwork library. The current shop cards still render CSS/emoji previews in `src/App.jsx`; they must be wired to these SVG paths before edits here automatically change the live shop display.

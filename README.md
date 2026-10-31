# PDF Simple — Expo starter app

A minimal Android/iOS PDF utility starter built with Expo and `pdf-lib`.

## Included in this starter
- Pick JPG/PNG images and convert them into one PDF.
- Select multiple PDFs and merge them.
- Extract selected pages from a PDF into a new PDF.
- Share the generated PDF using the phone's share sheet.
- Minimal home screen and an advertising placeholder.

## Not yet implemented
PDF-to-Word, PDF-to-Excel, PDF-to-JPG, compression, password protection, and a production ad integration are marked as future work. The current PDF library does not provide high-quality OCR or full Office-document conversion.

## Run locally
1. Install Node.js (LTS).
2. Extract this folder.
3. Run `npm install`.
4. Run `npx expo install --fix` if Expo reports version mismatches.
5. Run `npx expo start`.
6. Install Expo Go on a test phone and scan the QR code.

## Build store-ready apps
Use EAS Build to create Android and iOS builds. Set your own unique bundle identifier/package name in `app.json` before publishing.

## Ads
The app contains a clearly labeled ad placeholder only. Real AdMob ads are not configured yet. Configure test ad units and privacy/consent disclosures before release.

## Privacy
This starter processes selected files on-device and does not upload them to a server.

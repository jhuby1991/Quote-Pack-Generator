#!/bin/sh
# Run this with the path to your .pem file (from when you packed the extension).
# Example: ./scripts/get-key.sh ../packgenerator.pem
# Copy the single line of output and replace PASTE_KEY_HERE in manifest.json with it.
# Then everyone who loads this folder unpacked gets the same extension ID.
if [ -z "$1" ]; then
  echo "Usage: ./scripts/get-key.sh path/to/your.pem" 1>&2
  exit 1
fi
openssl rsa -in "$1" -pubout -outform DER 2>/dev/null | base64 | tr -d '\n'
echo

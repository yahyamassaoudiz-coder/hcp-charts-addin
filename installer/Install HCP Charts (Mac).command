#!/bin/bash
# HCP Charts - installer for PowerPoint on macOS
DIR="$HOME/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef"
SRC="$(cd "$(dirname "$0")" && pwd)/manifest.xml"
mkdir -p "$DIR"
if curl -fsSL --max-time 20 "https://yahyamassaoudiz-coder.github.io/hcp-charts-addin/manifest.xml" -o "$DIR/hcp-charts.xml.tmp" && grep -q "2bf33f10-92d1-48a3-b3ac-49c904918edc" "$DIR/hcp-charts.xml.tmp"; then
  mv -f "$DIR/hcp-charts.xml.tmp" "$DIR/hcp-charts.xml"
else
  rm -f "$DIR/hcp-charts.xml.tmp"; cp -f "$SRC" "$DIR/hcp-charts.xml"
fi
echo ""
echo "  HCP Charts installed."
echo "  Quit PowerPoint completely (Cmd+Q), reopen it, then: Insert > Add-ins > My Add-ins > HCP Charts."
echo ""

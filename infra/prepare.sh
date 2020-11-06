#!/bin/bash
set -e
cd ..
npm run build
echo 'Zipping up express...'
zip -r express.zip . -x "*infra*"
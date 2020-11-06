#!/bin/bash
set -e
npm run build
echo 'Zipping up express...'
zip -r express.zip . -x "*infra*"
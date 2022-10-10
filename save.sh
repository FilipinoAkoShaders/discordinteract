set -e

git config --global user.email $1
git config --global user.name 'Filipino'

git add .

git commit -m "project files"

git remote add origin "$2"

git pull origin main

git push origin main

git diff
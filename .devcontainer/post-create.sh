direnv allow
devbox install

[ -f .env ] || touch .env

# golang stuff
devbox run go install -v golang.org/x/tools/gopls@latest

direnv reload
sudo pkill -u postgres && sudo -E /usr/local/share/pq-init.sh

sudo apt install -y postgresql-common ca-certificates
sudo yes '' | sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-18-pgvector

direnv allow
devbox install

[ -f .env ] || touch .env

# golang stuff
devbox run go install -v golang.org/x/tools/gopls@latest

direnv reload
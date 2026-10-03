#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(id -u)" != "0" ]]; then
  echo "Erro: a inicialização do firewall precisa executar como root." >&2
  exit 1
fi

# Se o firewall falhar, o ambiente não é iniciado.
/usr/local/sbin/init-firewall.sh

# Troca para o usuário node e remove as capacidades do processo.
# Não há sudo nem mecanismo de elevação disponível para o agente.
exec setpriv \
  --reuid=node \
  --regid=node \
  --init-groups \
  --bounding-set=-all \
  --inh-caps=-all \
  --ambient-caps=-all \
  --no-new-privs \
  "$@"
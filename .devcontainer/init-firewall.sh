#!/usr/bin/env bash
set -Eeuo pipefail

# Lista fixa na imagem. Não é lida de um arquivo editável no workspace.
ALLOWED_DOMAINS=(
  registry.npmjs.org
  api.anthropic.com
  registry.npmjs.org
  api.anthropic.com
  binaries.prisma.sh
  api.telegram.org
  routellm.abacus.ai
)

if [[ "$(id -u)" != "0" ]]; then
  echo "Erro: firewall precisa de root." >&2
  exit 1
fi

# IPv6 deve ter sido desabilitado pelo Docker.
for setting in all default; do
  if [[ "$(cat "/proc/sys/net/ipv6/conf/${setting}/disable_ipv6")" != "1" ]]; then
    echo "Erro: IPv6 não está desabilitado." >&2
    exit 1
  fi
done

# Política fechada antes de alterar as regras.
iptables -w -P INPUT DROP
iptables -w -P FORWARD DROP
iptables -w -P OUTPUT DROP

iptables -w -F INPUT
iptables -w -F FORWARD
iptables -w -F OUTPUT

# Não limpamos a tabela NAT: ela pode conter o DNS interno do Docker.

# Comunicação local entre front/back e processos do próprio container.
iptables -w -A INPUT -i lo -j ACCEPT
iptables -w -A OUTPUT -o lo -j ACCEPT

# Respostas de conexões já permitidas.
iptables -w -A INPUT \
  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

iptables -w -A INPUT -p tcp --dport 3000 -j ACCEPT

iptables -w -A OUTPUT \
  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# DNS apenas para os resolvedores IPv4 configurados pelo Docker.
mapfile -t DNS_SERVERS < <(
  awk '$1 == "nameserver" && $2 ~ /^[0-9.]+$/ {print $2}' \
    /etc/resolv.conf
)

if (( ${#DNS_SERVERS[@]} == 0 )); then
  echo "Erro: nenhum resolvedor DNS IPv4 encontrado." >&2
  exit 1
fi

for dns in "${DNS_SERVERS[@]}"; do
  iptables -w -A OUTPUT \
    -d "$dns" -p udp --dport 53 -j ACCEPT

  iptables -w -A OUTPUT \
    -d "$dns" -p tcp --dport 53 -j ACCEPT
done

# Não permite novas conexões para redes privadas ou endereços especiais.
# As exceções acima são somente loopback, respostas e DNS.
BLOCKED_NETWORKS=(
  0.0.0.0/8
  10.0.0.0/8
  100.64.0.0/10
  127.0.0.0/8
  169.254.0.0/16
  172.16.0.0/12
  192.168.0.0/16
  198.18.0.0/15
  224.0.0.0/4
  240.0.0.0/4
)

for network in "${BLOCKED_NETWORKS[@]}"; do
  iptables -w -A OUTPUT \
    -d "$network" -j REJECT --reject-with icmp-admin-prohibited
done

# Resolve cada destino na inicialização.
# Uma falha de DNS interrompe a inicialização em vez de liberar a rede.
for domain in "${ALLOWED_DOMAINS[@]}"; do
  echo "Resolvendo destino permitido: ${domain}"

  answers="$(
    dig +time=3 +tries=2 +noall +answer A "$domain"
  )"

  mapfile -t addresses < <(
    printf '%s\n' "$answers" |
      awk '$4 == "A" {print $5}' |
      sort -u
  )

  if (( ${#addresses[@]} == 0 )); then
    echo "Erro: nenhum IPv4 encontrado para ${domain}." >&2
    exit 1
  fi

  for address in "${addresses[@]}"; do
    if [[ ! "$address" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      echo "Erro: resposta DNS inválida: ${address}" >&2
      exit 1
    fi

    echo "Permitindo HTTPS: ${domain} -> ${address}"

    iptables -w -A OUTPUT \
      -d "$address" \
      -p tcp --dport 443 \
      -m conntrack --ctstate NEW \
      -j ACCEPT
  done
done

# Todo o restante é recusado.
iptables -w -A OUTPUT \
  -j REJECT --reject-with icmp-admin-prohibited

echo "Firewall configurado: npm e API Anthropic via HTTPS."
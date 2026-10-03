FROM node:22-bookworm-slim

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        dnsutils \
        git \
        iptables \
        ripgrep \
        util-linux \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# Instala o Claude na imagem, não no computador host.
RUN npm install -g @anthropic-ai/claude-code \
    && npm cache clean --force

# O volume de configuração será inicializado com essa propriedade.
RUN mkdir -p /home/node/.claude /workspace \
    && chown node:node /home/node/.claude /workspace

COPY init-firewall.sh /usr/local/sbin/init-firewall.sh
COPY entrypoint.sh /usr/local/sbin/jail-entrypoint.sh

# Aceita arquivos criados no Windows com finais de linha CRLF.
RUN sed -i 's/\r$//' \
        /usr/local/sbin/init-firewall.sh \
        /usr/local/sbin/jail-entrypoint.sh \
    && chmod 0755 \
        /usr/local/sbin/init-firewall.sh \
        /usr/local/sbin/jail-entrypoint.sh \
    && chown root:root \
        /usr/local/sbin/init-firewall.sh \
        /usr/local/sbin/jail-entrypoint.sh

ENV HOME=/home/node
ENV CLAUDE_CONFIG_DIR=/home/node/.claude
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
ENV DISABLE_AUTOUPDATER=1

WORKDIR /workspace

ENTRYPOINT ["/usr/local/sbin/jail-entrypoint.sh"]
CMD ["sleep", "infinity"]
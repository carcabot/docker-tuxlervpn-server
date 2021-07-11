FROM ubuntu:18.04

LABEL maintainer="Florin <florin@carcabot.ro>"
LABEL name="docker-tuxlervpn-server"
LABEL version="latest"

# set ENV
ENV DISPLAY :0

# Install wget
RUN apt-get update
RUN apt-get install -y wget

# Add 32-bit architecture
RUN dpkg --add-architecture i386
RUN apt-get update

# Install Wine
RUN apt-get install -y software-properties-common gnupg2
RUN wget -nc https://dl.winehq.org/wine-builds/winehq.key
RUN apt-key add winehq.key
RUN apt-add-repository 'deb https://dl.winehq.org/wine-builds/ubuntu/ bionic main'
RUN add-apt-repository 'ppa:cybermax-dexter/sdl2-backport'
RUN apt-get install -y --install-recommends winehq-stable winbind iptables xvfb
# DEBUG
RUN apt-get install -y net-tools curl npm nano
RUN npm i ws

# Install Xvfb
RUN apt-get update

# Turn off Fixme warnings
ENV WINEDEBUG=fixme-all

# Setup Wine prefix
ENV WINEPREFIX=/root/.demo
ENV WINEARCH=win64
RUN winecfg

COPY setup.tar .
COPY startup.sh /usr/local/bin/entrypoint.sh
COPY transocks /usr/local/bin/transocks
COPY client.js .

RUN chmod +x /usr/local/bin/entrypoint.sh && tar -xvf setup.tar

# Run application
ENTRYPOINT ["/bin/bash", "entrypoint.sh"]
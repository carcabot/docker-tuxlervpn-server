#!/usr/bin/env bash
WHITELIST_PORT=31112
TRANSOCKS_PORT=12345
INTERFACE=eth0

echo "Creating /etc/transocks.toml"
echo 'listen = "0.0.0.0:vTRANSOCKS-PORT"
proxy_url = "vPROXY-URL"
[log]
level = "info"' >/etc/transocks.toml

echo "Setting config variables"
sed -i "s|vPROXY-URL|$PROXY_URL|g" /etc/transocks.toml
sed -i "s/vTRANSOCKS-PORT/$TRANSOCKS_PORT/g" /etc/transocks.toml

echo "Restarting transocks and redirecting traffic via iptables"
transocks &
sysctl -w net.ipv4.conf.eth0.route_localnet=1

echo "-----------------------------"
echo "# Adding iptables chain rules"
echo "-----------------------------"
# Create new chain
iptables -v -t nat -N REDSOCKS
# Exclude local and reserved addresses
iptables -v -t nat -A REDSOCKS -d 0.0.0.0/8 -j RETURN
iptables -v -t nat -A REDSOCKS -d 10.0.0.0/8 -j RETURN
iptables -v -t nat -A REDSOCKS -d 127.0.0.0/8 -j RETURN
iptables -v -t nat -A REDSOCKS -d 169.254.0.0/16 -j RETURN
iptables -v -t nat -A REDSOCKS -d 172.16.0.0/12 -j RETURN
iptables -v -t nat -A REDSOCKS -d 192.168.0.0/16 -j RETURN
iptables -v -t nat -A REDSOCKS -d 224.0.0.0/4 -j RETURN
iptables -v -t nat -A REDSOCKS -d 240.0.0.0/4 -j RETURN
iptables -v -t nat -A REDSOCKS -p tcp --dport $WHITELIST_PORT -j RETURN
# Redirect all tcp traffic to port
iptables -v -t nat -A REDSOCKS -p tcp -j REDIRECT --to-ports $TRANSOCKS_PORT
iptables -v -t nat -A OUTPUT -p tcp -j REDSOCKS
# Forward ports to local namespace
iptables -v -t nat -I PREROUTING -p tcp --match multiport --dports 1701,10702,19703,28704,37705,46706,55707,64708 -j DNAT --to-destination 127.0.0.1
iptables -v -t nat -I PREROUTING -p tcp --match multiport --dports 23321,23322,23323,23324,23325,23326,23327,23328 -j DNAT --to-destination 127.0.0.1

sleep 1s

wineboot -u ExtensionHelperAppManager.exe
wineboot -u ExtensionHelperApp.exe

xvfb-run -a wine ExtensionHelperAppManager.exe &
xvfb-run -a wine ExtensionHelperApp.exe &

if [[ "$1" ]]; then
    eval "$@"
fi

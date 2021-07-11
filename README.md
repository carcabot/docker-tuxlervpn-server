## Connect to VPN using TuxlerVPN Docker

---

### Build

```sh
./build.sh
```

Define a proxy server:

```sh
export PROXY_URL=http://127.0.0.1:8080
```

### Run

```sh
./run.sh
```
### Use proxy

```sh
curl --proxy 127.0.0.1:12345 http://lumtest.com/myip.json
```

Docker will route all traffic from PROXY_URL to TuxlerVPN Server. Read client.js for more informations about how TuxlerVPN works.
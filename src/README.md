# InView Cloud SCADA

![Version Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/init-inview-datasource&label=Marketplace&prefix=v&color=F47A20)
![Downloads Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.downloads&url=https://grafana.com/api/plugins/init-inview-datasource&label=Downloads&color=4c1)
![Grafana Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.grafanaDependency&url=https://grafana.com/api/plugins/init-inview-datasource&label=Grafana&color=blue)
![Build Badge](https://img.shields.io/github/actions/workflow/status/Init-Technologies/init-grafana/release.yml)
![License Badge](https://img.shields.io/github/license/Init-Technologies/init-grafana)
![Release Badge](https://img.shields.io/github/v/release/Init-Technologies/init-grafana)

## Overview

**InView Cloud SCADA** is an enterprise-grade **data observability platform** for industrial operations. It allows you to **connect, visualize, and monitor your business operations in real-time**. The plugin provides:  

- Enterprise-grade reliability for SCADA and IoT systems  
- Live monitoring and visualization of variables and connections  
- Query editor for selecting variables, connections, and live/alarm/event data  
- Pagination and filtering support for large datasets  

![Dashboard Example](https://github.com/Init-Technologies/init-grafana/blob/main/src/img/Dashboard.png)
![Query Editor](https://github.com/Init-Technologies/init-grafana/blob/main/src/img/Datasource.png)

---

## Key Features

- **Live, Alarm, and Event Data:** Choose the type of data you want to query.
- **Dynamic Connection & Variable Selection:**  
  Fetch connections and variables from the backend dynamically with filtering and pagination.
- **Query Editor Controls:**  
  - Select connection from available connections or search by text  
  - Select multiple variables from a list or search  
  - Configure prefix and OPC tags  
  - Set page and rows for pagination
- **Real-time updates:** Query editor triggers live updates automatically.

---

## Requirements

- Grafana >= 10.4.0  
- Node.js >= 18.x (for plugin development)  
- Access to InView backend API  

---

## Getting Started

1. **Install the plugin via Grafana CLI**:

```bash
grafana-cli plugins install init-inview-datasource

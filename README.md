# Gestore Automatizzato per WireGuard con Interfaccia Web

[![Licenza: MIT](https://img.shields.io/badge/Licenza-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Un sistema completo per automatizzare il deployment e la gestione di server WireGuard su Ubuntu 24.
Questo progetto modernizza la gestione delle VPN utilizzando **WireGuard** (più veloce, snello e sicuro di OpenVPN) e offre una dashboard web moderna per la gestione quotidiana, costruita con tecnologie recenti come Python FastAPI, SQLModel e Tabler.

Che tu sia un amministratore di sistema esperto o un appassionato che vuole proteggere la propria navigazione, questo sistema ti permette di essere operativo in pochi minuti con una VPN di nuova generazione.

---

## 🚀 Installazione Rapida

L'installazione è progettata per essere "Zero Config": cloni la repository, lanci lo script e il sistema fa il resto.

### Prerequisiti

*   **OS**: Una macchina (fisica o virtuale) con **Ubuntu 24.04 LTS** (consigliato) o Debian 12.
*   **Privilegi**: Accesso root (`sudo`).
*   **Rete**:
    *   **IP Pubblico**: Ideale.
    *   **NAT**: Se sei dietro un router, devi inoltrare la porta UDP utilizzata dall'istanza (default `51820` per la prima istanza) e TCP `80` (per la dashboard).

### Passaggi

1.  **Scarica il Progetto**
    Accedi al tuo server e clona la repository:
    ```bash
    git clone https://github.com/EdoardoFiore/VPNManager.git
    cd VPNManager/scripts
    ```

2.  **Avvia l'Installazione**
    Esegui lo script di setup. Ti guiderà attraverso l'installazione delle dipendenze (WireGuard, Python, Nginx).
    ```bash
    sudo bash setup-vpn-manager.sh
    ```

3.  **Finito!**
    Al termine, lo script ti fornirà l'URL per accedere alla dashboard (es. `http://TUO_IP_PUBBLICO`) e la chiave API generata.

---

## ✨ Funzionalità Principali

*   **WireGuard Core**: Utilizza il protocollo WireGuard ad alte prestazioni, integrato nel kernel Linux.
*   **Gestione Multi-Istanza**: Crea istanze multiple su porte diverse (es. `wg0` su 51820, `wg1` su 51821) per separare reti e scopi.
*   **Dashboard Intuitiva**: Pannello web responsive basato su _Tabler_ per vedere stato, QR code e configurazioni.
*   **Tunnel Mode Intelligente**:
    *   **Full Tunnel**: Invia tutto il traffico Internet attraverso la VPN.
    *   **Split Tunnel**: Specifica le sottoreti da ruotare (es. reti aziendali), lasciando il resto del traffico diretto.
    *   **Auto-Secure**: In modalità Split Tunnel, il firewall imposta automaticamente una policy di default `DROP` per massima sicurezza.
*   **Gestione Client**:
    *   Generazione istantanea di chiavi (Pubblica/Privata/Preshared).
    *   Visualizzazione QR Code per mobile.
    *   Download configurazione `.conf`.
*   **Firewall Avanzato (Iptables Wrapper)**:
    *   **Machine Firewall**: Gestisci le regole di input/output globali della macchina server (es. permetti SSH solo da certi IP).
    *   **Group Firewall**: Crea gruppi logici (es. "Admin", "Guest") e assegna regole di accesso specifiche.
    *   Il backend gestisce automaticamente le chain `iptables` per garantire isolamento e sicurezza (es. `VPN_INPUT`, `VIG_<GroupID>`).
*   **Database SQLite**: Tutte le configurazioni sono salvate in un db `database.db` gestito via SQLModel, sostituendo i vecchi file JSON per maggiore robustezza.

---

## 🛠 Come Funziona (Backend e Architettura)

Per chi vuole capire cosa succede "sotto il cofano":

### Stack Tecnologico
*   **VPN Note**: WireGuard (Kernel Module).
*   **Backend**: Python 3.12+ con **FastAPI** e **SQLModel** (ORM per SQLite).
*   **Frontend**: PHP (Logic Layer) + HTML5/JS (Tabler UI) + AJAX per comunicare con le API.
*   **Server Web**: Nginx (Reverse Proxy & Auth).

### Posizionamento File

| Directory | Contenuto |
| :--- | :--- |
| `/opt/vpn-manager/backend` | API Server (Python). Contiene `main.py`, models, e i manager (WireGuard, Firewall). |
| `/opt/vpn-manager/backend/data` | Database SQLite (`database.db`) e configurazioni WireGuard generate. |
| `/opt/vpn-manager/frontend` | Interfaccia Web pubblica. |
| `/etc/wireguard` | Directory di sistema dove vengono linkate le configurazioni attive. |

### Processi e Servizi

1.  **Backend API** (`vpn-manager.service`): Servizio Systemd che esegue Uvicorn/FastAPI. Gestisce la logica, le chiamate di sistema (`wg`, `iptables`, `ip`) e il database.
2.  **Web Server** (`nginx`): Serve la dashboard statica/PHP e protegge l'accesso.
3.  **WireGuard** (`wg-quick@<nome>`): Servizio nativo di WireGuard per ogni interfaccia attiva.

---

## 👥 Gestione Utenti Dashboard

L'accesso alla dashboard è protetto da **Nginx Basic Auth**.

*   **Cambia password / Aggiungi utente**:
    ```bash
    sudo htpasswd /etc/nginx/.htpasswd tuonomeutente
    ```
*   **Rimuovi utente**:
    ```bash
    sudo htpasswd -D /etc/nginx/.htpasswd utente_da_rimuovere
    ```
    *Ricorda di ricaricare nginx (`sudo systemctl reload nginx`) dopo le modifiche.*

---

## 🆘 Troubleshooting

*   **Dashboard irraggiungibile**: Controlla Nginx (`systemctl status nginx`).
*   **Errore 500 / API Error**: Controlla i log del backend:
    ```bash
    journalctl -u vpn-manager -f
    ```
*   **Client connesso ma no traffico**:
    *   Verifica l'IP Forwarding (`sysctl net.ipv4.ip_forward`).
    *   Controlla il Masquerading nelle regole firewall (`iptables -t nat -L -v`).
    *   Se sei in Split Tunnel, controlla di non avere policy `DROP` che bloccano tutto senza regole di allow.

---

**Licenza**: MIT. Fanne buon uso!

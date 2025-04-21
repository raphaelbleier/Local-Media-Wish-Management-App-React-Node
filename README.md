# Local Media Wish Management App (React/Node.js)

Dies ist eine einfache Webanwendung zur lokalen Verwaltung von Film- und Serienwünschen mit Benutzerauthentifizierung und TMDb-Integration für die Suche und Anzeige von Medieninformationen. 
Die App ist für die Nutzung in einem lokalen Netzwerk gedacht.

## Features

*   **Benutzerauthentifizierung:** Benutzer müssen sich anmelden, um Wünsche hinzuzufügen und ihre eigenen Wünsche anzuzeigen.
*   **Admin-Bereich:** Administratoren können alle Wünsche einsehen, den Status ändern, normale Benutzer erstellen und grundlegende Statistiken anzeigen.
*   **TMDb-Integration:** Suche nach Filmen und Serien über die TMDb-API mit Autocomplete, Anzeige von Covern, Erscheinungsjahr und Medientyp.
*   **Staffelwahl:** Beim Hinzufügen einer Serie kann der Benutzer eine spezifische Staffel oder "alle Staffeln" angeben.
*   **Statusverwaltung:** Wünsche haben den Status "Offen" oder "Erledigt".
*   **Einfache Statistiken:** Anzeige der Anzahl offener/erledigter/gesamt Wünsche für Administratoren.
*   **Theme-Umschaltung:** Light- und Dark-Mode für das UI.
*   **Lokale Datenhaltung:** Alle Daten werden in einer lokalen SQLite-Datenbank gespeichert.

## Technologien

*   **Frontend:** React (mit Vite)
*   **Backend:** Node.js (mit Express.js)
*   **Datenbank:** SQLite
*   **API:** The Movie Database (TMDb) API

## Voraussetzungen

*   Node.js (inklusive npm oder yarn) installiert. Du kannst es von [https://nodejs.org/](https://nodejs.org/) herunterladen.
*   Git installiert.

## Installation und Setup

Führe die folgenden Schritte aus, um die Anwendung lokal einzurichten und zu starten:

1.  **Repository klonen:**
    ```bash
    git clone "https://github.com/raphaelbleier/Local-Media-Wish-Management-App-React-Node"
    cd Local-Media-Wish-Management-App-React-Node
    ```

2.  **TMDb API Schlüssel beschaffen:**
    *   Du benötigst einen API-Schlüssel von The Movie Database (TMDb). Wenn du noch keinen hast:
        *   Registriere dich auf [https://www.themoviedb.org/account/signup](https://www.themoviedb.org/account/signup).
        *   Gehe zu deinen Account-Einstellungen und dann zum Bereich "API".
        *   Registriere eine neue Developer API. Du benötigst den **API Read Access Token (v4 Auth)**. Dieser sieht so aus: `eyJhbGciOiJIUzI1NiI...`.

3.  **Backend Setup:**
    *   Navigiere in das Backend-Verzeichnis:
        ```bash
        cd backend
        ```
    *   Erstelle eine `.env`-Datei im `backend`-Verzeichnis und füge deine geheimen Schlüssel hinzu. Ersetze die Platzhalter durch deine tatsächlichen Werte.
        ```env
        # .env Datei im backend Ordner erstellen

        # Geheimer Schlüssel für JWT (Wähle eine lange, zufällige Zeichenkette!)
        JWT_SECRET=Deine_sehr_geheime_und_zufaellige_JWT_Zeichenkette

        # Dein TMDb API Read Access Token (v4 Auth)
        TMDB_API_READ_TOKEN=Dein_vollstaendiger_TMDb_v4_Read_Access_Token
        ```
        **Wichtig:** Wähle eine andere, sichere Zeichenkette für `JWT_SECRET` als die Standardwerte in den Beispielen. Füge deinen **vollständigen** TMDb v4 Token ein.
    *   Installiere die Backend-Abhängigkeiten:
        ```bash
        npm install
        # oder mit yarn: yarn install
        ```
    *   Die SQLite-Datenbank (`database.sqlite`) wird beim ersten Start des Backends automatisch erstellt. **Wenn du eine frühere Version ohne das TMDb-Schema hattest und die database.sqlite Datei existiert, lösche sie bitte vor dem ersten Start, um das neue Schema zu erstellen.**

4.  **Frontend Setup:**
    *   Navigiere in das Frontend-Verzeichnis:
        ```bash
        cd ../frontend
        ```
    *   Installiere die Frontend-Abhängigkeiten:
        ```bash
        npm install
        # oder mit yarn: yarn install
        ```
    *   Das Frontend ist standardmäßig so konfiguriert, dass es während der Entwicklung über einen Proxy auf die API-Endpunkte des Backends zugreift, das auf `http://localhost:3001` laufen sollte (siehe `frontend/vite.config.js`). **Normalerweise musst du hier keine Codeänderungen vornehmen, wenn Backend und Frontend auf demselben Computer laufen.**

## Anwendung starten

1.  **Backend starten:**
    *   Öffne ein neues Terminal-Fenster.
    *   Navigiere in das Backend-Verzeichnis (`./backend`).
    *   Starte den Server:
        ```bash
        npm start
        ```
    *   Du solltest im Terminal sehen, dass die Datenbank initialisiert wird (falls neu) und der Server auf Port 3001 startet.

2.  **Frontend starten:**
    *   Öffne ein weiteres neues Terminal-Fenster.
    *   Navigiere in das Frontend-Verzeichnis (`./frontend`).
    *   Starte den Entwicklungsserver:
        ```bash
        npm run dev
        ```
    *   Der Vite-Entwicklungsserver startet (normalerweise auf Port 3000) und öffnet die Anwendung im Browser.

3.  **App im Browser aufrufen:**
    *   Öffne deinen Webbrowser und gehe zu `http://localhost:3000`.

## Erste Schritte

1.  **Admin Login:** Gehe zu `http://localhost:3000/admin`. Melde dich mit den Standard-Admin-Daten an:
    *   Benutzername: `admin`
    *   Passwort: `admin`
    **(Ändere das Standardpasswort in einer realen Anwendung umgehend!)**
2.  **Benutzer erstellen:** Navigiere im Admin-Bereich zu "User erstellen" und erstelle Benutzerkonten für die Personen, die Wünsche hinzufügen sollen.
3.  **Benutzer Login:** Melde dich als Admin ab und gehe zurück zur Startseite (`http://localhost:3000/`). Melde dich mit einem der neu erstellten Benutzerkonten an.
4.  **Wünsche hinzufügen:** Im Benutzerbereich kannst du nun Film- oder Serientitel suchen, auswählen und Wünsche speichern.
5.  **Admin-Panel:** Logge dich wieder als Admin ein, um alle Wünsche zu sehen, als "Erledigt" zu markieren und Statistiken einzusehen.

## Zugriff im lokalen Netzwerk

Wenn du die App von anderen Geräten in deinem lokalen Netzwerk erreichen möchtest:

1.  Stelle sicher, dass sowohl der Computer, auf dem das Backend läuft (`npm start`), als auch das zugreifende Gerät im selben lokalen Netzwerk sind.
2.  Ermittle die lokale IP-Adresse des Computers, auf dem das Backend läuft (z.B. `192.168.1.100`).
3.  Greife von anderen Geräten über die IP-Adresse und den Backend-Port zu: `http://<Lokale_IP>:3001`.
4.  Möglicherweise musst du Firewall-Regeln auf dem Backend-Computer anpassen, um eingehende Verbindungen auf Port 3001 zuzulassen.

## Wichtige Sicherheitshinweise (Für den lokalen Gebrauch)

Diese App ist für die lokale Nutzung konzipiert.

*   **NICHT für den Einsatz im öffentlichen Internet geeignet!** Sicherheitsmaßnahmen (Passwort-Hashing, Token-Handling, Input-Validierung, Rate Limiting etc.) sind stark vereinfacht.
*   Der Standard-Admin (`admin`/`admin`) ist unsicher. Für den privaten Gebrauch in einem vertrauenswürdigen lokalen Netzwerk ist es jedoch gut genug
*   Der TMDb API-Schlüssel wird zwar im Backend verwaltet, sollte aber dennoch nicht öffentlich geteilt werden, falls dein Rate Limit für diesen Schlüssel überschritten wird.

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:7b2cbf,100:c77dff&height=200&section=header&text=NxsBotDeployDash&fontSize=50&fontAlignY=40&animation=twinkling&desc=Panel%20d'h%C3%A9bergement%20pour%20bots%20Discord%20%7C%20Claymorphism&descAlignY=60&descAlign=50" alt="NxsBotDeployDash Banner" />

  <p align="center">
    <img src="https://img.shields.io/badge/Design-Claymorphism_Violet-8A2BE2?style=for-the-badge" alt="Claymorphism Design">
    <img src="https://img.shields.io/badge/Backend-Node.js_20-2ECC71?style=for-the-badge&logo=node.js&logoColor=white" alt="NodeJS">
    <img src="https://img.shields.io/badge/Frontend-React_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/Process_Manager-PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white" alt="PM2">
    <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
  </p>

  <p align="center">
    <b>Transformez n'importe quel VPS Ubuntu/Debian en un panel privé d'hébergement de bots Discord (Node.js & Python).</b>
  </p>
</div>

---

## 📖 Présentation

**NxsBotDeployDash** est un gestionnaire d'hébergement léger, autonome et sécurisé pensé pour héberger facilement vos bots Discord. Inspiré des architectures multi-utilisateurs (façon Pterodactyl), il permet à un administrateur de gérer des comptes clients, d'allouer des emplacements de bots et d'offrir une interface moderne avec terminal en temps réel via WebSockets.

---

## ✨ Fonctionnalités Clés

- 🎨 **Design Claymorphism Violet :** Interface futuriste et soignée avec effets 3D doux, ombre portée colorée et mode sombre natif.
- 👥 **Gestion Multi-Utilisateurs (Pterodactyl-like) :**
  - L'administrateur crée les comptes clients et attribue les quotas/slots de bots.
  - Chaque client accède uniquement à ses propres bots et peut les démarrer, stopper ou redémarrer.
- 💻 **Terminal WebSockets en Direct :** Visualisez les logs et la console de vos bots instantanément sans accès SSH.
- ⚡ **Propulsé par PM2 :** Gestion automatique des processus en arrière-plan avec auto-restart en cas de crash du bot.
- 🔄 **Mise à Jour en 1-Clic :** Bouton intégré dans l'espace Administration pour mettre à jour le panel directement depuis GitHub.
- 📦 **Support Multi-Technologies :** Prise en charge native des bots **Node.js** (JS/TS) et **Python**.

---

## ⚡ Installation Rapide (VPS Ubuntu / Debian)

L'installation est 100% automatisée via un script d'installation interactif. Connectez-vous en SSH à votre serveur en tant que `root` (ou avec `sudo`) et exécutez :

```bash
bash <(curl -sSL https://raw.githubusercontent.com/nexos20lv/NxsBotDeployDash/main/deploy.sh)
```

### Que fait le script de déploiement ?
1. Installe **Node.js 20**, **Git**, et **PM2**.
2. Clone le dépôt **NxsBotDeployDash**.
3. Configure la base de données SQLite et crée le compte administrateur initial.
4. Compile le frontend React (Vite) et démarre l'API Backend.
5. Lance le panel sur le port `3001` sous la supervision de PM2.

> 💡 **Conseil Nginx :** Pour associer un nom de domaine avec SSL (HTTPS), configurez un reverse-proxy Nginx pointant vers `http://127.0.0.1:3001`.

---

## 🛠️ Stack Technique

| Composant | Technologie | Description |
| --- | --- | --- |
| **Frontend** | React 18 + Vite | Interface réactive rapide avec variables CSS Claymorphism |
| **Backend** | Express.js | API RESTful & gestionnaire d'authentification JWT |
| **Base de Données** | SQLite (Better-SQLite3) | Stockage local ultra-rapide sans installation de SGBD lourd |
| **Process Manager** | PM2 API | Contrôle et surveillance des processus enfants (bots Discord) |
| **Temps Réel** | WebSockets (WS) | Streaming en direct des sorties stdout/stderr des bots |

---

## 🔄 Administration & Mises à jour

1. Connectez-vous avec votre compte Administrateur.
2. Accédez à l'onglet **Admin Panel** dans le menu supérieur.
3. Cliquez sur le bouton **Update Panel** : le panel télécharge la dernière version depuis GitHub, recompile le frontend et redémarre le service automatiquement.

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
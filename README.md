# NxsBotDeployDash 🚀

Un panel d'hébergement complet pour bots Discord (Node.js & Python) pensé pour la simplicité et doté d'un magnifique design **Claymorphism Violet**.

![Claymorphism Design](https://img.shields.io/badge/Design-Claymorphism-8A2BE2)
![NodeJS](https://img.shields.io/badge/Backend-Node.js-2ECC71)
![React](https://img.shields.io/badge/Frontend-React_Vite-61DAFB)

Ce projet vous permet de transformer n'importe quel VPS (Ubuntu/Debian) en un gestionnaire d'hébergement privé. Il inclut un panel d'administration pour gérer des "clients", qui peuvent ensuite se connecter pour démarrer, arrêter, redémarrer leurs bots et consulter la console en direct.

---

## ✨ Fonctionnalités

- **Design Premium** : Interface utilisateur unique en "Claymorphism" (effets 3D souples, ombres colorées, mode sombre).
- **Architecture Pterodactyl-like** : 
  - L'Administrateur crée les comptes utilisateurs (clients).
  - L'Administrateur alloue des hébergements (slots de bots) aux clients.
  - Les clients ne voient que leurs propres bots et peuvent les gérer.
- **Console en direct** : Visualisez les logs de vos bots en temps réel grâce aux WebSockets.
- **Process Manager** : Propulsé par PM2 en arrière-plan pour que vos bots restent en ligne H24 et redémarrent automatiquement en cas de crash.
- **Mise à jour en 1-Clic** : Bouton dans l'interface Admin pour mettre à jour automatiquement le panel depuis ce repo GitHub.

---

## ⚡ Installation (VPS Ubuntu/Debian)

L'installation est entièrement automatisée. Connectez-vous en SSH à votre VPS en tant que `root` (ou avec un utilisateur sudo) et lancez la commande suivante :

```bash
bash <(curl -sSL https://raw.githubusercontent.com/nexos20lv/NxsBotDeployDash/main/deploy.sh)
```

**Que fait cette commande ?**
1. Elle installe Node.js 20, Git et PM2.
2. Elle clone ce dépôt.
3. Elle vous demande de choisir un **Nom d'utilisateur** et un **Mot de passe** pour le compte Administrateur par défaut.
4. Elle installe et compile le panel.
5. Elle démarre le panel en arrière-plan sur le port 3001.

*Note : Par défaut, le panel est accessible sur le port 3001. N'hésitez pas à utiliser NGINX pour faire un reverse proxy vers un nom de domaine.*

---

## 🛠️ Stack Technique

- **Base de données** : SQLite (Zéro configuration, parfait pour un petit panel).
- **Backend** : Express.js, PM2 API, JWT pour l'authentification.
- **Frontend** : React.js, Vite.js, CSS Vanilla (Variables personnalisées pour le Claymorphism).

---

## 🔄 Comment mettre à jour le panel ?

Connectez-vous à votre interface web avec votre compte Administrateur. Allez dans le **Admin Panel** (en haut à droite) et cliquez sur **Update Panel**. Le panel se mettra à jour tout seul et redémarrera !

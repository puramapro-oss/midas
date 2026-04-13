# MIDAS - Google Play Setup (3 minutes)

## Pre-requis
- Compte Google Play Console (25$ one-time)
- Service Account JSON (google-service-account.json)

## Etapes

### 1. Creer l'application (1 min)
1. Google Play Console > **Toutes les applications** > **Creer une application**
2. Nom : `MIDAS - Trading IA`
3. Langue : Francais
4. Application : Application
5. Gratuit
6. Cocher les declarations
7. **Creer**

### 2. Configuration Store (1 min)
1. **Presence sur le Store** > **Fiche principale** :
   - Description courte : "Signaux crypto IA, bots de trading, analyse technique avancee"
   - Description complete : copier depuis store.config.json
   - Icone : icon.png (512x512)
   - Graphique : feature-graphic.png (1024x500)
   - Screenshots : dossier screenshots/android/
2. **Classification du contenu** > Remplir le questionnaire > "Tout public"
3. **Coordonnees** : purama.pro@gmail.com

### 3. Activer l'API et le Service Account (1 min)
1. Google Cloud Console > API > **Google Play Android Developer API** > Activer
2. IAM > Service Account > Copier `google-service-account.json` a la racine du projet mobile
3. Google Play Console > **Parametres** > **Acces API** > Lier le projet Google Cloud
4. Ajouter le Service Account avec le role **Admin**

### 4. Premier build EAS
```bash
cd mobile
eas build --platform android --profile production
eas submit --platform android --profile production
```

### 5. Verification
- Google Play Console > **Version de production** > Verifier le statut
- Premiere review : 1-7 jours
- Ensuite : mises a jour automatiques via EAS

## Notes
- Le fichier `google-service-account.json` ne doit JAMAIS etre commite dans git
- Bundle ID : `dev.purama.midas`
- Signing key : geree automatiquement par EAS

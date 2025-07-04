# 🏖️ Sommerhus i Ebeltoft - Familie App

En moderne web-app til at administrere familiens sommerhus i Ebeltoft med booking, beskeder, tjeklister og mere.

## ✨ Funktioner

### 🏠 **Check-in & Check-ud**
- Digital indtjek og udtjek system
- Rapporter husets tilstand ved ankomst
- Se nuværende og tidligere gæster

### 💬 **Beskedvæg** 
- Del beskeder med familien
- Tag andre brugere med @brugernavn
- Pin vigtige beskeder
- Svar og kommentarer med notifikationer

### 📅 **Kalender & Booking**
- Visuelt kalenderoversigt
- Opret bookinger med tider og antal gæster
- Håndtering af dobbeltbookinger
- Personlige farver for hver bruger

### ✅ **Tjekliste**
- Konfigurérbar tjekliste for afgang
- Kategorier: Vand, Strøm, Rengøring, Sikkerhed
- Admin kan tilføje/fjerne punkter

### 👥 **Kontakter**
- Familie kontaktbog
- Automatisk tilføjelse ved registrering
- Telefon og email links

### 📸 **Fotoalbum**
- Upload billeder med beskrivelser
- Kommentarer og likes
- Tag andre i kommentarer

### 📖 **Nedlukning & Opstart Guide**
- Rich-text editor til detaljerede guides
- Billeder og formatering
- Procedure dokumentation

### ⚙️ **Indstillinger**
- Personaliser kalenderfarve
- Upload forsidebillede (mobil-kompatibelt)
- Baggrundsbilleder for hver sektion
- Notifikations indstillinger

### 🛡️ **Admin Panel** (kun for admins)
- Brugerstyring og admin rettigheder
- Automatisk backup system
- Database statistikker
- Download og administrer backups

## 🚀 Teknologi

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL database)
- **Offline Support**: localStorage fallback
- **Mobile Ready**: Responsive design, touch-friendly
- **Icons**: React Icons (Feather)
- **Rich Text**: ReactQuill editor

## 📱 Deployment Guide

### 1. **Vercel Deployment (Anbefalet)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# Project name: sommerhus-ebeltoft
# Directory: ./
# Want to override settings? N
```

**Eller via Vercel Dashboard:**
1. Gå til [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Auto-deploy aktiveres

### 2. **Netlify Deployment**

```bash
# Build projektet
npm run build

# Upload dist/ folder til netlify.com
# Eller connect GitHub repository
```

### 3. **GitHub Pages**

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"homepage": "https://yourusername.github.io/sommerhus-ebeltoft",
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# Deploy
npm run deploy
```

## 🔧 Installation & Udvikling

```bash
# Clone repository
git clone <repository-url>
cd sommerhus-ebeltoft

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📊 Database Struktur

Appen bruger Supabase med følgende tabeller:
- `users_sommerhus_2024` - Brugere og profiler
- `bookings_sommerhus_2024` - Kalender bookinger
- `messages_sommerhus_2024` - Beskedvæg posts
- `photos_sommerhus_2024` - Fotoalbum billeder
- `checkins_sommerhus_2024` - Check-in/ud data
- `backups_sommerhus_2024` - Automatiske backups

## 🔒 Sikkerhed

- Row Level Security (RLS) aktiveret
- Familie-venlige policies (alle kan læse/skrive)
- Admin rolle for brugerstyring
- Automatiske backups for datasikkerhed

## 🎨 Tilpasning

- **Farver**: Rediger `tailwind.config.js`
- **Billeder**: Upload via indstillinger
- **Funktioner**: Tilføj nye komponenter i `src/components/`

## 📞 Support

Appen er designet til at være super brugervenlig med:
- Intuitive ikoner og navigation
- Danske labels og beskeder
- Responsive design til alle enheder
- Offline support som fallback

**Lavet med ❤️ til familien**
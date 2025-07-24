# 🔍 DEBUG STEPS

## 1. Åbn F12 Developer Tools
- Tryk F12 eller højreklik → "Inspicér"
- Gå til "Console" fanen

## 2. Tjek console for fejl
Se efter røde fejlmeddelelser som:
- "Cannot read property..."
- "TypeError..."
- "ReferenceError..."

## 3. Tjek Network fanen
- Ser du HTTP fejl (404, 500)?
- Indlæser JavaScript filerne?

## 4. Tjek localStorage
I Console, skriv:
```javascript
localStorage.getItem('sommerhus_bookings')
```

## 5. Test kalender funktioner
- Kan du se kalenderen?
- Kan du klikke "Ny booking"?
- Kan du udfylde formen?

## 6. Test synkronisering
- Åbn 2 tabs
- Lav en booking i den ene
- Skifter den til den anden?
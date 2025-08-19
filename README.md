# 🏐 Volleyball Scoreboard

> **Sistema profesional de marcador de volleyball para transmisiones en vivo con OBS**

Un scoreboard completo y moderno desarrollado con **Vue 3**, **TypeScript** y **Tailwind CSS**, diseñado específicamente para ser usado en transmisiones deportivas en vivo a través de **OBS Studio**.

## 📋 **Descripción del Proyecto**

Este proyecto consiste en un sistema de marcador de volleyball que se divide en dos componentes principales:

1. **🎮 Panel de Control (Controller)** - Interfaz de administración para controlar el partido
2. **📺 Overlay de Transmisión** - Vista limpia y profesional para ser mostrada en OBS

### **Características Principales**

- ⚡ **Sincronización en tiempo real** entre controlador y overlay
- 🎨 **Animaciones fluidas** para cambios de puntuación y eventos
- 🏆 **Lógica completa de volleyball** (sets, rotaciones, saque)
- 📊 **Historial de eventos** del partido
- ⌨️ **Atajos de teclado** para operación rápida
- 🎯 **Diseño responsive** y profesional
- 🔧 **Configuración flexible** de equipos y reglas

## 🚀 **Stack Tecnológico**

- **Frontend:** Vue 3 + Composition API + TypeScript
- **Estado:** Pinia Store
- **Estilos:** Tailwind CSS
- **Build:** Vite
- **Linting:** ESLint + Oxlint + Prettier
- **Comunicación:** LocalStorage + Custom Events

## 📈 **Estado del Proyecto**

### **Progreso General: 40%**

| Fase                    | Estado         | Progreso | Descripción                       |
| ----------------------- | -------------- | -------- | --------------------------------- |
| 🏗️ **Setup Inicial**    | ✅ Completado  | 100%     | Proyecto base configurado         |
| 📦 **Store & Lógica**   | ✅ Completado  | 100%     | Store de Pinia + lógica del juego |
| 🎮 **Panel de Control** | 🔄 En progreso | 20%      | Componentes del controlador       |
| 📺 **Overlay OBS**      | 🔄 En progreso | 20%      | Componentes para transmisión      |
| 🔄 **Comunicación**     | ✅ Completado  | 100%     | Sistema de sincronización         |
| 🎨 **Estilos**          | ✅ Completado  | 100%     | Diseño y animaciones base         |
| 🧪 **Testing**          | ❌ Pendiente   | 0%       | Tests unitarios e integración     |
| 📚 **Documentación**    | 🔄 En progreso | 60%      | Guías de uso y configuración      |

### **Fases Completadas ✅**

- [x] **Fase 1:** Configuración inicial del proyecto Vue 3 + TypeScript
- [x] **Fase 1:** Setup de herramientas de desarrollo (ESLint, Prettier, etc.)
- [x] **Fase 1:** Configuración de Pinia y Vue Router
- [x] **Fase 1:** Estructura de carpetas definida
- [x] **Fase 2:** Store principal del scoreboard implementado
- [x] **Fase 2:** Tipos TypeScript completos definidos
- [x] **Fase 2:** Sistema de comunicación en tiempo real
- [x] **Fase 2:** Composables principales creados
- [x] **Fase 2:** Configuración de rutas del router
- [x] **Fase 2:** Estilos base con Tailwind CSS
- [x] **Fase 2:** Vista de inicio (HomeView) implementada

### **Fases en Progreso 🔄**

- [x] **Fase 2:** Documentación del proyecto y README ✅
- [ ] **Fase 3:** Crear componentes base reutilizables (50%)
- [ ] **Fase 3:** Vista del controlador (ControllerView) (0%)
- [ ] **Fase 3:** Vista del overlay (OverlayView) (0%)

### **Próximas Fases 📋**

- [ ] **Fase 3:** Implementar ControllerView completa
- [ ] **Fase 3:** Implementar OverlayView completa
- [ ] **Fase 3:** Crear componentes reutilizables (TeamLogo, ServeIndicator, etc.)
- [ ] **Fase 4:** Integrar comunicación en tiempo real en las vistas
- [ ] **Fase 4:** Implementar atajos de teclado
- [ ] **Fase 4:** Agregar validaciones y manejo de errores
- [ ] **Fase 5:** Testing completo del sistema
- [ ] **Fase 5:** Optimizaciones de rendimiento
- [ ] **Fase 6:** Funcionalidades avanzadas (estadísticas, exportar datos)
- [ ] **Fase 7:** Documentación final y deployment

## 📁 **Estructura del Proyecto Actual**

```
volleyball-scoreboard/
├── 📁 public/                 # Assets estáticos
├── 📁 src/
│   ├── 📁 components/         # Componentes Vue (por crear)
│   │   ├── 📁 controller/     # Componentes del panel de control
│   │   ├── 📁 overlay/        # Componentes del overlay
│   │   └── 📁 common/         # Componentes reutilizables
│   ├── 📁 composables/        # Composition API hooks ✅
│   │   ├── useCommunication.ts ✅
│   │   └── useGameState.ts     ✅
│   ├── 📁 stores/             # Pinia stores ✅
│   │   └── scoreboard.ts      ✅
│   ├── 📁 types/              # Definiciones TypeScript ✅
│   │   └── game.types.ts      ✅
│   ├── 📁 utils/              # Utilidades y helpers ✅
│   │   ├── constants.ts       ✅
│   │   └── validators.ts      ✅
│   ├── 📁 views/              # Vistas principales ✅
│   │   └── HomeView.vue       ✅
│   ├── 📁 router/             # Configuración de rutas ✅
│   │   └── index.ts           ✅
│   ├── App.vue               ✅
│   ├── main.ts               ✅
│   └── style.css             ✅
├── package.json              ✅
├── vite.config.ts            ✅
├── tailwind.config.js        ✅
├── postcss.config.js         ✅
├── tsconfig.json             ✅
└── README.md                 ✅
```

## 🎯 **Logros Actuales**

### **✅ Arquitectura Sólida**

- Store centralizado con Pinia para manejo del estado
- Tipos TypeScript completos y bien definidos
- Sistema de comunicación robusto entre componentes
- Composables reutilizables para lógica compartida

### **✅ Configuración Profesional**

- Vite + Vue 3 + TypeScript + Tailwind CSS
- ESLint + Prettier + Oxlint para calidad de código
- Hot reload y desarrollo optimizado
- Build system configurado para producción

### **✅ Funcionalidades Core**

- Lógica completa de volleyball (puntuación, sets, rotaciones)
- Validaciones de reglas oficiales del deporte
- Sistema de historial de eventos
- Comunicación en tiempo real via LocalStorage y eventos

### **✅ Sistema de Estilos**

- Tailwind CSS completamente configurado
- Animaciones personalizadas para eventos del juego
- Variables CSS para fácil personalización
- Responsive design desde el inicio

## 🚀 **Instalación y Desarrollo Actual**

### **Setup del Proyecto**

```bash
# Clonar el repositorio
git clone [url-del-repo]
cd volleyball-scoreboard

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build
```

### **Scripts Disponibles Actualizados**

| Script               | Descripción                           |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Servidor de desarrollo en puerto 3000 |
| `npm run build`      | Build para producción                 |
| `npm run preview`    | Preview del build                     |
| `npm run type-check` | Verificación de tipos TypeScript      |
| `npm run lint`       | Linting con ESLint y Oxlint           |
| `npm run format`     | Formatear código con Prettier         |
| `npm run controller` | Abrir controlador en puerto 3000      |
| `npm run overlay`    | Abrir overlay en puerto 3001          |

### **Estado de las Rutas**

| Ruta          | Estado           | Descripción                        |
| ------------- | ---------------- | ---------------------------------- |
| `/`           | ✅ Funcionando   | Vista de inicio con navegación     |
| `/controller` | 🔄 En desarrollo | Panel de control (por implementar) |
| `/overlay`    | 🔄 En desarrollo | Overlay para OBS (por implementar) |
| `/settings`   | ❌ Pendiente     | Configuración del sistema          |

## 🎯 **Uso del Sistema**

### **Para Operadores del Marcador:**

1. Abrir `/controller` en el navegador
2. Configurar nombres de equipos y logos
3. Usar los controles para manejar el partido
4. Atajos de teclado para operación rápida

### **Para Transmisiones en OBS:**

1. Abrir `/overlay` en otra pestaña/ventana
2. En OBS: Agregar fuente "Navegador"
3. URL: `http://localhost:5173/overlay`
4. Resolución recomendada: 1920x200px
5. El overlay se actualiza automáticamente

## ⌨️ **Atajos de Teclado** (Planeados)

| Tecla    | Acción                    |
| -------- | ------------------------- |
| `Q`      | +1 Punto Equipo Local     |
| `W`      | +1 Punto Equipo Visitante |
| `A`      | -1 Punto Equipo Local     |
| `S`      | -1 Punto Equipo Visitante |
| `Z`      | Rotar Equipo Local        |
| `X`      | Rotar Equipo Visitante    |
| `N`      | Siguiente Set             |
| `Ctrl+R` | Reiniciar Partido         |

## 🔧 **Configuración**

### **Reglas del Juego (Configurables)**

- Sets máximos: 5 (mejor de 5)
- Puntos por set: 25 (15 en set decisivo)
- Ventaja mínima: 2 puntos
- Rotación automática: 6 jugadores

### **Personalización**

- Nombres de equipos
- Logos personalizados
- Colores del overlay
- Animaciones y efectos

## 🤝 **Contribución**

Este proyecto está en desarrollo activo. Las contribuciones son bienvenidas:

1. Fork del proyecto
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📝 **Roadmap**

### **v1.0.0 - MVP (Próxima Release)**

- [x] Setup inicial del proyecto
- [ ] Store principal con lógica de volleyball
- [ ] Panel de control básico
- [ ] Overlay para OBS
- [ ] Comunicación en tiempo real

### **v1.1.0 - Mejoras**

- [ ] Estadísticas avanzadas
- [ ] Temas personalizables
- [ ] Exportar/importar configuraciones
- [ ] Soporte para múltiples formatos de overlay

### **v2.0.0 - Funcionalidades Avanzadas**

- [ ] WebSocket para comunicación
- [ ] Base de datos para historial
- [ ] API REST
- [ ] Dashboard web

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 **Autores**

- **Desarrollador Principal** - _Desarrollo inicial_ - [Tu nombre]

## 🙏 **Agradecimientos**

- Vue.js team por el excelente framework
- Tailwind CSS por el sistema de diseño
- OBS Studio por hacer posible las transmisiones
- Comunidad de volleyball por la inspiración

---

**📧 Contacto:** [tu-email@ejemplo.com]  
**🔗 Demo:** [enlace-a-demo] (próximamente)  
**📖 Docs:** [enlace-a-documentacion] (en desarrollo)

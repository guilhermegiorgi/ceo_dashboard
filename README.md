# GG.AI Labs - CEO Dashboard

A sophisticated executive dashboard that integrates with your Obsidian second brain to provide AI-powered business insights and strategic recommendations.

## 🚀 Overview

This dashboard serves as a central command center for CEOs and executives, leveraging AI agents to analyze knowledge graphs, provide real-time business intelligence, and deliver actionable insights through advanced integrations with Obsidian, MCP (Model Context Protocol), and custom AI services.

## ✨ Features

### Core Dashboard
- **Executive Metrics Overview**: Real-time KPIs including revenue growth, AI efficiency scores, active projects, and team productivity
- **AI-Powered Insights**: Strategic recommendations with confidence scoring and priority classification
- **Bilingual Support**: Seamless PT-BR/English toggle with complete localization
- **Responsive Design**: Premium UI with smooth animations and micro-interactions

### Integrations
- **Obsidian Knowledge Graph**: Direct integration with your second brain for knowledge node analysis
- **MCP Services**: Model Context Protocol integration for AI agent communication
- **Project Management**: Real-time project tracking with progress visualization
- **AI Embeddings API**: Custom API integration for content analysis and insights

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Context API** for state management

### Planned Integrations
- **Obsidian API** for knowledge graph access
- **Custom Embeddings API** (transformers/embeddings)
- **MCP Protocol** for AI agent communication
- **WebSocket** connections for real-time updates

## 🏗 Architecture

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx      # Main navigation with language toggle
│   ├── MetricCard.tsx  # KPI display cards
│   ├── AIInsightCard.tsx # AI-generated insights
│   ├── ObsidianIntegration.tsx # Knowledge graph interface
│   ├── ProjectOverview.tsx # Project management panel
│   ├── MCPIntegration.tsx # MCP services panel
│   └── LanguageToggle.tsx # Bilingual toggle component
├── contexts/           # React contexts
│   └── LanguageContext.tsx # Internationalization
├── App.tsx            # Main application component
└── main.tsx          # Application entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Obsidian with API access (for full functionality)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd gg-ai-labs-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Environment Setup

Create a `.env` file in the root directory:

```env
# Obsidian Integration
VITE_OBSIDIAN_API_URL=http://localhost:27123
VITE_OBSIDIAN_API_KEY=your_obsidian_api_key

# Custom AI Services
VITE_EMBEDDINGS_API_URL=your_embeddings_api_url
VITE_EMBEDDINGS_API_KEY=your_api_key

# MCP Configuration
VITE_MCP_ENDPOINT=your_mcp_endpoint
VITE_MCP_API_KEY=your_mcp_key
```

## 🔧 Configuration

### Obsidian Setup
1. Install the Obsidian Local REST API plugin
2. Configure API access in Obsidian settings
3. Update environment variables with your Obsidian API details

### AI Services Setup
1. Deploy your embeddings/transformers API
2. Configure API endpoints in environment variables
3. Set up authentication keys

## 📊 Features in Detail

### AI Insights Engine
- **Confidence Scoring**: Each insight includes a confidence percentage
- **Priority Classification**: High/Medium/Low priority system
- **Actionable Recommendations**: Clear next steps for each insight
- **Real-time Analysis**: Live processing of your knowledge graph

### Knowledge Graph Integration
- **Search Functionality**: Query your Obsidian vault directly
- **Node Visualization**: See connections and relationships
- **Recent Activity**: Track latest knowledge updates
- **AI-Generated Insights**: Automatic analysis of your notes

### Project Management
- **Progress Tracking**: Visual progress bars and status indicators
- **Team Management**: Member allocation and workload distribution
- **Budget Monitoring**: Financial tracking and ROI calculations
- **Deadline Management**: Timeline visualization and alerts

## 🌐 Internationalization

The dashboard supports both English and Portuguese (Brazil) with:
- Complete UI translation
- Localized number formatting
- Currency conversion (USD ↔ BRL)
- Date/time localization
- Cultural adaptations

## 🎨 Design System

### Color Palette
- **Primary**: Blue to Purple gradients
- **Secondary**: Green to Teal gradients
- **Accent**: Purple to Pink gradients
- **Status Colors**: Green (success), Yellow (warning), Red (error)
- **Background**: Slate 900/800 with transparency layers

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable with proper contrast
- **Metrics**: Large, prominent numbers
- **Labels**: Subtle, informative

## 🔮 Roadmap

### Phase 1 (Current)
- [x] Core dashboard UI
- [x] Bilingual support
- [x] Mock data integration
- [x] Responsive design

### Phase 2 (Next)
- [ ] Obsidian API integration
- [ ] Real-time data connections
- [ ] WebSocket implementation
- [ ] User authentication

### Phase 3 (Future)
- [ ] MCP protocol integration
- [ ] Advanced AI agents
- [ ] Custom embeddings processing
- [ ] Multi-user support
- [ ] Mobile app companion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the [documentation](DOCS.md) for detailed guides

## 🙏 Acknowledgments

- Obsidian team for the knowledge management platform
- React and Vite communities
- Tailwind CSS for the design system
- Lucide for the beautiful icons
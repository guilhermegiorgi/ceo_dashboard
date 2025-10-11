import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Dados mockados que antes estavam no frontend
const mockOpportunities = [
  { id: '1', title: 'AI-Powered Healthcare Diagnostics', description: 'Emerging opportunity in AI-driven medical imaging and diagnostic tools for small clinics', market: 'Healthcare', potentialValue: '$2.3B', timeToMarket: '18 months', confidence: 87, riskLevel: 'medium', competitorCount: 12, trendDirection: 'up', keyFactors: ['Regulatory approval pathway clear', 'Growing demand from rural clinics', 'AI technology maturity'], actionItems: ['Conduct regulatory research', 'Partner with medical institutions', 'Develop MVP'], sources: ['FDA reports', 'Market research', 'Industry analysis'] },
  { id: '2', title: 'Sustainable Supply Chain Analytics', description: 'AI platform for optimizing supply chains with sustainability metrics and carbon footprint tracking', market: 'Enterprise Software', potentialValue: '$1.8B', timeToMarket: '12 months', confidence: 92, riskLevel: 'low', competitorCount: 8, trendDirection: 'up', keyFactors: ['ESG compliance requirements', 'Supply chain disruptions', 'Carbon tracking mandates'], actionItems: ['Build sustainability metrics engine', 'Secure enterprise partnerships', 'Develop carbon API'], sources: ['ESG reports', 'Supply chain studies', 'Regulatory updates'] }
];

const mockCompetitorInsights = [
  { id: '1', competitor: 'TechCorp AI', movement: 'Acquired healthcare AI startup MedVision for $150M', impact: 'negative', urgency: 'high', recommendation: 'Accelerate healthcare AI development or consider strategic partnerships', source: 'Industry news', timestamp: '2 hours ago' },
  { id: '2', competitor: 'DataFlow Systems', movement: 'Launched new supply chain optimization platform', impact: 'negative', urgency: 'medium', recommendation: 'Differentiate with sustainability focus and carbon tracking', source: 'Product launch announcement', timestamp: '1 day ago' }
];

router.use(authMiddleware);

router.get('/opportunities', (req, res) => {
  res.json({ success: true, data: mockOpportunities });
});

router.get('/competitors', (req, res) => {
  res.json({ success: true, data: mockCompetitorInsights });
});

export default router;

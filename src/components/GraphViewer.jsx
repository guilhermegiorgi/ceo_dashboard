import React, { useEffect, useRef, useState } from 'react';
import { DataSet, Network } from 'vis-network/standalone'; // Simulação de uso de vis-network

const GraphViewer = () => {
    const networkRef = useRef(null);
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Lógica de Fetch para o Backend
    useEffect(() => {
        const fetchGraphData = async () => {
            try {
                const response = await fetch('/api/vault/graph');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success && data.data) {
                    setGraphData(data.data);
                } else {
                    setError(data.error || 'Falha ao carregar dados do grafo.');
                }
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchGraphData();
    }, []);

    // 2. Lógica de Renderização do Grafo
    useEffect(() => {
        if (graphData && networkRef.current) {
            // Verifica se a biblioteca vis-network está disponível
            if (typeof Network === 'undefined') {
                console.error("vis-network não está carregado. Verifique a instalação.");
                return;
            }

            const nodes = new DataSet(graphData.nodes.map(node => ({
                id: node.id,
                label: node.label,
                title: node.path,
                group: node.type, // Usar o tipo para agrupar e colorir
            })));

            const edges = new DataSet(graphData.edges.map(edge => ({
                from: edge.from,
                to: edge.to,
                arrows: 'to',
            })));

            const data = { nodes, edges };
            const options = {
                nodes: { shape: 'dot', size: 16 },
                edges: { smooth: true },
                physics: { enabled: true },
                // ... outras opções de visualização
            };

            const network = new Network(networkRef.current, data, options);

            // Adicionar lógica de clique para abrir a nota
            network.on("click", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const node = nodes.get(nodeId);
                    console.log(`Abrir nota: ${node.title}`);
                    // Simular navegação ou abertura de nota
                    // window.location.href = `/vault/note?path=${encodeURIComponent(node.title)}`;
                }
            });
        }
    }, [graphData]);

    if (loading) {
        return <div className="graph-placeholder">Carregando Grafo de Conhecimento...</div>;
    }

    if (error) {
        return <div className="graph-error">Erro ao carregar o grafo: {error}</div>;
    }

    if (!graphData || graphData.nodes.length === 0) {
        return <div className="graph-placeholder">Grafo vazio. Crie mais notas e links!</div>;
    }

    return (
        <div className="graph-container" style={{ height: '80vh', width: '100%' }}>
            <div ref={networkRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};

export default GraphViewer;

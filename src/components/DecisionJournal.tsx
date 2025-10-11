import { useState, FormEvent } from 'react';
import { useAPI } from '../hooks/useAPI';
import apiClient from '../services/apiClient';

// Define the types for Decision and ActionItem
interface ActionItem {
  id: string;
  description: string;
  completed: boolean;
}

interface Decision {
  id: string;
  title: string;
  context: string;
  outcome: string;
  date: string;
  actionItems: ActionItem[];
}

const DecisionJournal = () => {
  // Fetching data with the corrected useAPI hook, now with refetch
  const { data: decisions, loading, error, refetch } = useAPI<Decision[]>('/api/decisions');

  // State for the form
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [outcome, setOutcome] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title || !context) {
      setSubmitError('Title and Context are required.');
      return;
    }

    try {
      await apiClient.request('/api/decisions', {
        method: 'POST',
        body: { title, context, outcome },
      });
      // Reset form and refetch data on success
      setTitle('');
      setContext('');
      setOutcome('');
      refetch(); 
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit decision.');
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Decision Journal</h2>

      {/* Form for new decisions */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-800 rounded-md">
        <h3 className="text-xl font-semibold mb-3">Log a New Decision</h3>
        {submitError && <p className="text-red-500 mb-3">{submitError}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Decision Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="p-2 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Context / Problem"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="p-2 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Expected Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="p-2 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors">
          Save Decision
        </button>
      </form>

      {/* Display existing decisions */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Past Decisions</h3>
        {loading && <p>Loading decisions...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        <div className="space-y-4">
          {decisions && decisions.map((decision) => (
            <div key={decision.id} className="p-4 bg-gray-800 rounded-md">
              <h4 className="font-bold text-lg">{decision.title}</h4>
              <p className="text-sm text-gray-400">{new Date(decision.date).toLocaleDateString()}</p>
              <p><span className="font-semibold">Context:</span> {decision.context}</p>
              <p><span className="font-semibold">Outcome:</span> {decision.outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionJournal;

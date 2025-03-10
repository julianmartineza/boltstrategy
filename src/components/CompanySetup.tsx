import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const INDUSTRY_OPTIONS = [
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Retail',
  'Financial Services',
  'Education',
  'Other'
];

const COMPANY_SIZE_OPTIONS = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees'
];

export default function CompanySetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [companyData, setCompanyData] = useState({
    name: '',
    industry: '',
    otherIndustry: '',
    size: '',
    website: '',
    annual_revenue: ''
  });

  const [diagnosticData, setDiagnosticData] = useState({
    currentChallenges: '',
    marketPosition: '',
    keyStrengths: '',
    growthAspiration: ''
  });

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const companyPayload = {
        name: companyData.name,
        industry: companyData.industry === 'Other' ? companyData.otherIndustry : companyData.industry,
        size: companyData.size,
        website: companyData.website,
        annual_revenue: companyData.annual_revenue,
        user_id: user.id
      };

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([companyPayload])
        .select()
        .single();

      if (companyError) throw companyError;

      if (company) {
        setStep(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosticSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!companies?.id) throw new Error('Company not found');

      const { error: diagnosticError } = await supabase
        .from('diagnostics')
        .insert([{
          company_id: companies.id,
          diagnostic_data: diagnosticData,
          user_id: user.id
        }]);

      if (diagnosticError) throw diagnosticError;

      navigate('/dashboard/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`rounded-full h-8 w-8 flex items-center justify-center ${
                step === 1 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                1
              </div>
              <div className="ml-4 font-medium">Company Profile</div>
            </div>
            <div className="flex-1 mx-4 border-t-2 border-gray-200" />
            <div className="flex items-center">
              <div className={`rounded-full h-8 w-8 flex items-center justify-center ${
                step === 2 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                2
              </div>
              <div className="ml-4 font-medium">Business Diagnostic</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === 1 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h2 className="ml-3 text-2xl font-bold text-gray-900">Company Profile</h2>
            </div>
            
            <form onSubmit={handleCompanySubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  placeholder="https://example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="annual_revenue" className="block text-sm font-medium text-gray-700">
                  Annual Revenue (USD)
                </label>
                <input
                  type="number"
                  id="annual_revenue"
                  min="0"
                  step="1000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={companyData.annual_revenue}
                  onChange={(e) => setCompanyData({ ...companyData, annual_revenue: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                  Industry
                </label>
                <select
                  id="industry"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={companyData.industry}
                  onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                >
                  <option value="">Select an industry</option>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              {companyData.industry === 'Other' && (
                <div>
                  <label htmlFor="otherIndustry" className="block text-sm font-medium text-gray-700">
                    Specify Industry
                  </label>
                  <input
                    type="text"
                    id="otherIndustry"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={companyData.otherIndustry}
                    onChange={(e) => setCompanyData({ ...companyData, otherIndustry: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                  Company Size
                </label>
                <select
                  id="size"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={companyData.size}
                  onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                >
                  <option value="">Select company size</option>
                  {COMPANY_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Saving...' : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Diagnostic</h2>
            
            <form onSubmit={handleDiagnosticSubmit} className="space-y-6">
              <div>
                <label htmlFor="challenges" className="block text-sm font-medium text-gray-700">
                  What are your current business challenges?
                </label>
                <textarea
                  id="challenges"
                  required
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={diagnosticData.currentChallenges}
                  onChange={(e) => setDiagnosticData({ ...diagnosticData, currentChallenges: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  How would you describe your current market position?
                </label>
                <textarea
                  id="position"
                  required
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={diagnosticData.marketPosition}
                  onChange={(e) => setDiagnosticData({ ...diagnosticData, marketPosition: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="strengths" className="block text-sm font-medium text-gray-700">
                  What are your company's key strengths?
                </label>
                <textarea
                  id="strengths"
                  required
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={diagnosticData.keyStrengths}
                  onChange={(e) => setDiagnosticData({ ...diagnosticData, keyStrengths: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="growth" className="block text-sm font-medium text-gray-700">
                  What are your growth aspirations for the next 3-5 years?
                </label>
                <textarea
                  id="growth"
                  required
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={diagnosticData.growthAspiration}
                  onChange={(e) => setDiagnosticData({ ...diagnosticData, growthAspiration: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Saving...' : 'Start Strategy Development'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Company, Diagnostic } from '../types';

export default function CompanyProfile() {
  const { user } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user) return;

      try {
        // Load company data
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);

        // Load diagnostic data
        if (companyData) {
          const { data: diagnosticData, error: diagnosticError } = await supabase
            .from('diagnostics')
            .select('*')
            .eq('company_id', companyData.id)
            .single();

          if (diagnosticError) throw diagnosticError;
          setDiagnostic(diagnosticData);
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Building2 className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No company profile found. Please complete the company setup process.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Company Header */}
        <div className="px-6 py-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-sm text-gray-500">{company.industry}</p>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.size}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a href={company.website} className="text-blue-600 hover:text-blue-500" target="_blank" rel="noopener noreferrer">
                      {company.website}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Annual Revenue</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ${new Intl.NumberFormat().format(company.annual_revenue)}
                  </dd>
                </div>
              </dl>
            </div>

            {diagnostic && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Diagnostic</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current Challenges</dt>
                    <dd className="mt-1 text-sm text-gray-900">{diagnostic.diagnostic_data.currentChallenges}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Market Position</dt>
                    <dd className="mt-1 text-sm text-gray-900">{diagnostic.diagnostic_data.marketPosition}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Key Strengths</dt>
                    <dd className="mt-1 text-sm text-gray-900">{diagnostic.diagnostic_data.keyStrengths}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Growth Aspirations</dt>
                    <dd className="mt-1 text-sm text-gray-900">{diagnostic.diagnostic_data.growthAspiration}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
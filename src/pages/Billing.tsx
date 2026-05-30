import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Receipt, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface Transaction {
  id: string;
  orderId: string | number;
  plan: string;
  billing: string;
  amountCents: number;
  status: string;
  paidAt?: { toDate: () => Date };
  createdAt?: { toDate: () => Date };
  expiresAt?: number;
}

export default function Billing() {
  const { userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !userData) {
      navigate('/login', { replace: true });
    }
  }, [userData, authLoading, navigate]);

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchTransactions = async () => {
      try {
        const q = query(
          collection(db, 'pendingPayments'),
          where('uid', '==', userData.uid)
        );
        const snapshot = await getDocs(q);
        
        // Sorting in memory because Firestore requires composite index for where + orderBy
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        data.sort((a, b) => {
          const tA = a.paidAt?.toDate().getTime() || a.createdAt?.toDate().getTime() || 0;
          const tB = b.paidAt?.toDate().getTime() || b.createdAt?.toDate().getTime() || 0;
          return tB - tA; // Descending
        });
        
        setTransactions(data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transaction history.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userData?.uid]);

  if (authLoading) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040814',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#fff',
      paddingBottom: '4rem'
    }}>
      {/* Premium Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(4,8,20,0.7)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.25rem', boxShadow: '0 0 20px rgba(168,85,247,0.4)'
          }}>A4</div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>AI4Montage</span>
        </Link>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '4rem auto', padding: '0 2rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Billing & History</h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '3rem' }}>Manage your subscription and view your past transactions.</p>
        </motion.div>

        {/* Current Plan Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.5rem', padding: '2rem', marginBottom: '3rem',
            display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center'
          }}
        >
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Current Plan
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, textTransform: 'capitalize', color: userData?.plan === 'ultra' ? '#c084fc' : userData?.plan === 'pro' ? '#22d3ee' : '#fff' }}>
                {userData?.plan || 'Free'}
              </h2>
              {userData?.planExpiresAt && userData.planExpiresAt > Date.now() && (
                <div style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: 700 }}>
                  Active
                </div>
              )}
            </div>
            {userData?.planExpiresAt && userData.planExpiresAt > Date.now() ? (
              <div style={{ color: '#94a3b8', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} /> Renews on {new Date(userData.planExpiresAt).toLocaleDateString()}
              </div>
            ) : userData?.plan !== 'free' ? (
              <div style={{ color: '#f87171', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> Plan expired
              </div>
            ) : null}
          </div>
          <div>
            <Link to="/pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#fff', textDecoration: 'none', padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.9rem',
              boxShadow: '0 4px 15px rgba(168,85,247,0.3)', transition: 'transform 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <CreditCard size={18} /> Upgrade Plan
            </Link>
          </div>
        </motion.div>

        {/* Transactions Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Receipt size={24} color="#a855f7" /> Transaction History
          </h3>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading transactions...</div>
          ) : error ? (
            <div style={{ padding: '2rem', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '1rem', border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '1.5rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#64748b', marginBottom: '1rem' }}><Receipt size={48} style={{ opacity: 0.5 }} /></div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No transactions yet</h4>
              <p style={{ color: '#94a3b8' }}>Your successful payments will appear here.</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Transaction ID</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Plan</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Amount</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const date = tx.paidAt?.toDate() || tx.createdAt?.toDate();
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            #{tx.orderId}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', color: '#cbd5e1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={14} color="#64748b" />
                            {date ? date.toLocaleString() : 'N/A'}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', textTransform: 'capitalize', fontWeight: 600, color: tx.plan === 'ultra' ? '#c084fc' : '#22d3ee' }}>
                            {tx.plan} {tx.billing}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#fff' }}>
                            {(tx.amountCents / 100).toFixed(2)} EGP
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            {tx.status === 'paid' ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <CheckCircle size={12} /> Paid
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <Clock size={12} /> Pending
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

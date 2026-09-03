import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/tourApi';
import { useAuth } from '../context/AuthContext';
import { Btn, ErrBanner } from '../components';

export default function CartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['purchase-cart'],
    queryFn: () => api.getCart(token),
    enabled: Boolean(token),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const checkoutMut = useMutation({
    mutationFn: () => api.checkoutCart(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-cart'] });
      qc.invalidateQueries({ queryKey: ['public-tour'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (itemId) => api.removeCartItem(itemId, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-cart'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });

  if (isLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (error) return <div className="container" style={{ padding: 40 }}><ErrBanner>{error.message}</ErrBanner></div>;

  return (
    <div className="container" style={{ padding: '32px 0 80px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/browse')} style={{ marginBottom: 16 }}>
        Back to browsing
      </button>

      <div className="card p-24 fade-up" style={{ marginBottom: 20 }}>
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <div>
            <span className="eyebrow">Shopping cart</span>
            <h1 style={{ marginTop: 4 }}>Your cart</h1>
          </div>
          <Btn variant="primary" onClick={() => checkoutMut.mutate()} disabled={!cart?.items.length || checkoutMut.isLoading}>
            {checkoutMut.isLoading ? 'Processing…' : 'Checkout'}
          </Btn>
        </div>

        {checkoutMut.isError && (
          <div style={{ marginTop: 16 }}><ErrBanner>{checkoutMut.error.message}</ErrBanner></div>
        )}

        <div style={{ marginTop: 20 }}>
          {cart?.items.length === 0 ? (
            <div className="empty" style={{ padding: 22 }}>
              <h3>Your cart is empty</h3>
              <p>Add a tour from browse to start buying.</p>
            </div>
          ) : (
            <div className="col gap-16">
              {cart.items.map((item) => (
                <div key={item.id} className="card fade-up p-20" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{item.tour_name}</h3>
                    <p className="muted" style={{ marginTop: 6 }}>{item.tour_description || 'No description available.'}</p>
                    <p className="muted" style={{ marginTop: 6 }}>€{item.price.toFixed(2)}</p>
                  </div>
                  <div className="col gap-8" style={{ alignItems: 'flex-end' }}>
                    <Btn variant="ghost" size="sm" onClick={() => removeMut.mutate(item.id)} disabled={removeMut.isPending}>
                      Remove
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="row between" style={{ marginTop: 24, fontSize: 18, fontWeight: 600 }}>
          <span>Total</span>
          <span>€{cart?.total.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>
    </div>
  );
}

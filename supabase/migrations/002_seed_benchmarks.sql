-- Seed initial benchmark data (variable P&I, 60-70% LVR band as base)
insert into lender_benchmarks (lender, loan_type, lvr_band, avg_existing_rate, advertised_rate, loyalty_gap, call_success_rate, avg_reduction, sample_size, last_updated)
values
  ('Commonwealth Bank', 'variable_pi', '60_70', 6.89, 5.95, 0.94, 58.0, 0.38, 2841, now()),
  ('Westpac',           'variable_pi', '60_70', 6.92, 6.04, 0.88, 61.0, 0.43, 2210, now()),
  ('NAB',               'variable_pi', '60_70', 6.89, 6.09, 0.80, 62.0, 0.41, 1903, now()),
  ('ANZ',               'variable_pi', '60_70', 6.70, 5.99, 0.71, 69.0, 0.47, 1744, now()),
  ('Bendigo Bank',      'variable_pi', '60_70', 6.63, 6.11, 0.52, 54.0, 0.29,  612, now()),
  ('ING',               'variable_pi', '60_70', 6.12, 5.84, 0.28, 71.0, 0.22,  488, now()),
  ('Macquarie Bank',    'variable_pi', '60_70', 5.93, 5.79, 0.14, 44.0, 0.11,  341, now())
on conflict (lender, loan_type, lvr_band) do nothing;

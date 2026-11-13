revoke insert on public.bike_rentals from anon;
grant insert on public.bike_rentals to authenticated;

drop policy if exists "Customers can create bike rental bookings" on public.bike_rentals;

create policy "Customers can create bike rental bookings"
  on public.bike_rentals for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (auth.jwt()->>'is_anonymous') is distinct from 'true'
  );

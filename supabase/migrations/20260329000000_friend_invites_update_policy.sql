create policy "Invitees can mark invites accepted"
  on friend_invites for update
  using (true)
  with check (
    accepted_by_user_id = get_my_app_user_id()
    or declined_by_user_id = get_my_app_user_id()
  );

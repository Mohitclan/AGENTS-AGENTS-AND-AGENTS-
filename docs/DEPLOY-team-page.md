# Putting the team page online

This puts `scripts/dashboard.mjs` on the company's EC2 server at https://team.panscience.ai, behind a password and HTTPS. It takes about 30 minutes. Someone with SSH access and `sudo` runs it, and someone who controls the panscience.ai DNS does step 1.

## Read this first

- **The server is shared.** It runs MotionRepo production and other company apps, so get the server owner's OK. These steps add one app and one nginx site, and they don't change anything else.
- **The team would use the server's Claude login.** That's the same plan MotionRepo uses for customer videos, so team tasks and customer videos would compete for it. Step 5 stops team tasks at 70%, which leaves room for customers. If the company wants the team kept on its own plan, sign in to a separate Linux user with that plan instead.
- **The server gets its own copy of the data.** Leads, reports and the queue change on the server once tasks run there. From then on, treat the server as the main copy and stop running tasks on the laptop.
- **Everyone shares one password.** Anyone who has it can read the leads and start tasks on the plan. They can't send anything: approvals stay in chat with a person.

## Steps

1. **Point the name at the server.** Add a DNS `A` record: `team` → `13.232.209.31`.

2. **Sign in and check what's there.** Port 4317 should show nothing. Keep the `pm2 list` output, so you can compare it in step 8.

   ```bash
   ssh -i ~/.ssh/Appmania.pem ubuntu@13.232.209.31
   ss -ltn | grep 4317
   pm2 list
   node --version
   which claude
   certbot --version
   ```

   Node must be version 20 or later. If `claude` or `certbot` is missing, stop here and sort that out first.

3. **Get the code.** The repo is private, so this asks for a GitHub username and a token that can read it.

   ```bash
   git clone https://github.com/Mohitclan/AGENTS-AGENTS-AND-AGENTS-.git ~/sales-team
   cd ~/sales-team
   ```

4. **Choose a password and hash it.** Use at least 12 characters. The first command waits for you to type it and shows nothing. Only the hash is stored.

   ```bash
   read -rs P
   printf %s "$P" | node scripts/dashboard.mjs --hash
   unset P
   ```

5. **Save the settings.** Paste the hash where shown. Git ignores this file.

   ```bash
   nano .env.team-page
   chmod 600 .env.team-page
   ```

   ```text
   TEAM_PAGE_HOST=team.panscience.ai
   TEAM_PAGE_PASSWORD_HASH=<the hash from step 4>
   JARVIS_STOP_AT=0.70
   ```

6. **Start the page.** It only listens inside the server until nginx is set up.

   ```bash
   set -a; . ./.env.team-page; set +a
   pm2 start scripts/dashboard.mjs --name team-page
   pm2 save
   ```

7. **Add the nginx site.** Run `sudo nano /etc/nginx/sites-available/team-page`, and paste this in:

   ```nginx
   server {
       listen 80;
       server_name team.panscience.ai;
       client_max_body_size 32k;

       location / {
           proxy_pass http://127.0.0.1:4317;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

   Then turn it on and add the HTTPS certificate. Choose the redirect to HTTPS if `certbot` asks.

   ```bash
   sudo ln -s /etc/nginx/sites-available/team-page /etc/nginx/sites-enabled/team-page
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d team.panscience.ai
   ```

8. **Check it.**
   - `pm2 list` shows the same apps as in step 2, all still online, plus `team-page`.
   - https://motionrepo.panscience.ai still loads.
   - https://team.panscience.ai shows only a password box, and a wrong password is refused.
   - After signing in, the page shows the leads. Give it one small task and wait for the report.

## Updating it

Tasks change files on the server, so a plain `git pull` can stop on a conflict. Stop and ask for help if it does.

```bash
cd ~/sales-team && git pull
set -a; . ./.env.team-page; set +a
pm2 restart team-page --update-env
```

A restart signs everyone out and stops a running task. Use **Start waiting tasks** on the page to run it again.

## Changing the password

Repeat steps 4 and 5, then run the restart commands above.

## Taking it offline

This removes the page and leaves everything else on the server as it was.

```bash
pm2 delete team-page
pm2 save
sudo rm /etc/nginx/sites-enabled/team-page
sudo nginx -t
sudo systemctl reload nginx
```

## Hosting mission control instead

`scripts/control.mjs` is the fuller page: the agents at their desks working live, a page per agent (what it made, its activity, its failures and why, its tasks, its memory), logs as a table or one column per agent, leads, reports and everything waiting for a person. It uses the same `.env.team-page` (password hash and host name), so steps 1–5 stay the same.

- **Step 6:** start it on its own port instead of, or as well as, the team page:

  ```bash
  set -a; . ./.env.team-page; set +a
  pm2 start scripts/control.mjs --name mission-control
  pm2 save
  ```

- **Step 7:** point nginx at port 4318, and let the live stream through unbuffered:

  ```nginx
  location / {
      proxy_pass http://127.0.0.1:4318;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_buffering off;
      proxy_read_timeout 1h;
  }
  ```

- **Step 8:** the page should show the password box first, then the floor of agents. Give it one small task and watch the agent it hands work to light up.

Both pages sign people in separately; one password covers both. Neither can send an email or approve anything.

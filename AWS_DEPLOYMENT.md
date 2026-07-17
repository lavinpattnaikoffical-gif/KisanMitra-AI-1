# ☁️ AWS Deployment Guide for KisanMitra AI

This guide provides step-by-step instructions on how to deploy the **KisanMitra AI** application (Frontend + Backend) onto a single AWS EC2 instance.

The application is bundled together where the Node.js backend serves the Vite React frontend.

---

## 1. Prerequisites

1. An active AWS Account.
2. The `Kisan Mitra AI1.pem` SSH key file (make sure you have downloaded it and kept it secure).
3. Your EC2 instance's Public IPv4 address.

---

## 2. Connect to Your EC2 Instance

Open your terminal and use your `.pem` key to securely connect to your Ubuntu EC2 instance via SSH.

```bash
# Secure your key file first (required by SSH)
chmod 400 "Kisan Mitra AI1.pem"

# SSH into the server (replace the IP with your actual EC2 public IP)
ssh -i "Kisan Mitra AI1.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

## 3. Install System Dependencies

Once connected to the EC2 instance, update the package list and install Node.js and Git.

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20) and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v
npm -v

# Install Git
sudo apt install -y git
```

---

## 4. Clone the Repository & Install Dependencies

Clone your project repository onto the server.

```bash
# Clone the repo (you may need to configure a GitHub access token or SSH key on EC2)
git clone https://github.com/lavinpattnaikoffical-gif/KisanMitra-AI-1.git
cd KisanMitra-AI-1

# Install project dependencies
npm install
```

---

## 5. Configure Environment Variables

The application requires environment variables (like Database URLs, AI API Keys) to run correctly.

```bash
# Copy the example env file
cp .env.example .env

# Edit the environment variables
nano .env
```
*(Add your production secrets, then press `CTRL+O`, `Enter`, and `CTRL+X` to save and exit).*

---

## 6. Build the Application

Build the frontend React application and the Node.js backend server.

```bash
npm run build
```
*This command uses Vite to build the frontend and esbuild to bundle the server into the `dist/` directory.*

---

## 7. Run the App using PM2

**PM2** is a production process manager for Node.js. It ensures your application stays online, restarts if it crashes, and boots up on server restart.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application using PM2
pm2 start npm --name "kisanmitra-ai" -- start

# Save the PM2 list so it restarts automatically on server reboots
pm2 save
pm2 startup
```
*(Run the command outputted by `pm2 startup` to complete the startup hook configuration).*

---

## 8. Open AWS Security Groups (Firewall)

To access your application from a web browser, ensure your EC2 instance's Security Group allows incoming HTTP traffic.

1. Go to the AWS EC2 Console.
2. Select your instance and click on the **Security** tab.
3. Click the assigned **Security Group**.
4. Click **Edit inbound rules** -> **Add Rule**.
5. Add a rule for **Custom TCP**, Port **3000** (or whichever port your `server.ts` uses), and set Source to `0.0.0.0/0`.
   > **Tip:** For a production setup, it is recommended to set up an Nginx reverse proxy on Port 80/443 and map it to your local Node port.
6. Click **Save rules**.

---

## 🎉 Success!

You can now visit your deployed application at:
**`http://<YOUR_EC2_PUBLIC_IP>:<PORT>`**

---
*For troubleshooting, you can always check your application logs by running `pm2 logs kisanmitra-ai` on your EC2 instance.*

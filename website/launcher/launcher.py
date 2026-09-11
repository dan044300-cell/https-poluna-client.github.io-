# Poluna Launcher — Minecraft-style launcher (demo)
# Просит ключ подписки (с сайта), затем логин и пароль.
# Сборка:  pip install pyinstaller && pyinstaller --onefile --noconsole launcher.py
import hashlib
import json
import os
import re
import sys
import tkinter as tk
from tkinter import messagebox

POLUNA_BG = "#101010"
POLUNA_BG2 = "#1a1a1c"
POLUNA_GREEN = "#55ff55"
POLUNA_BLUE = "#55aaff"
POLUNA_ORANGE = "#f0a020"
POLUNA_GRAY = "#8f8f8f"
CONFIG_PATH = os.path.join(
    os.environ.get("APPDATA", "."), "PolunaLauncher", "config.json"
)

KEY_RE = re.compile(r"^POLUNA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")


def load_config():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_config(cfg):
    try:
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


class PolunaLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("Poluna Launcher")
        self.root.configure(bg=POLUNA_BG)
        self.root.geometry("760x560")
        self.root.resizable(False, False)

        header = tk.Frame(root, bg="#050505", height=74)
        header.pack(fill="x")
        header.pack_propagate(False)
        title = tk.Label(
            header, text="P O L U N A", bg="#050505", fg=POLUNA_GREEN,
            font=("Consolas", 26, "bold")
        )
        title.pack(side="left", padx=24)

        info = tk.Label(
            header, text="клиент 1.21.11", bg="#050505", fg=POLUNA_BLUE,
            font=("Consolas", 10)
        )
        info.pack(side="right", padx=24, pady=8)

        self.stage = tk.Frame(root, bg=POLUNA_BG2)
        self.stage.pack(fill="both", expand=True, padx=4, pady=4)

        bottom = tk.Label(
            root, text="© 2024 Poluna. Как левое крыло, так и правое.",
            bg="#050505", fg=POLUNA_GRAY, font=("Consolas", 9)
        )
        bottom.pack(fill="x", pady=6)

        self.ent_key = None
        self.ent_login = None
        self.ent_pass = None
        self.console = None
        self.cfg = load_config()
        self.show_step("key")

    def show_step(self, step):
        for w in self.stage.winfo_children():
            w.destroy()

        if step == "key":
            self.step_key()
        elif step == "auth":
            self.step_auth()
        elif step == "launching":
            self.step_launching()

    def widget(self, parent, text, color=POLUNA_GREEN, size=13, bold=True):
        return tk.Label(
            parent, text=text, bg=POLUNA_BG2, fg=color,
            font=("Consolas", size, "bold" if bold else "normal")
        )

    def step_key(self):
        s = self.stage
        self.widget(s, "Для продолжения нужен ключ подписки.").pack(pady=(46, 4))
        self.widget(
            s, "Купи подписку на сайте poluna-client.github.io — ключ придёт сразу.",
            color=POLUNA_GRAY, size=10, bold=False
        ).pack()

        self.ent_key = tk.Entry(
            s, width=34, font=("Consolas", 15, "bold"), fg="white",
            bg="#0b0b0c", insertbackground="white", justify="center"
        )
        self.ent_key.pack(pady=26)
        self.ent_key.insert(0, self.cfg.get("key", ""))
        self.ent_key.focus_set()
        self.ent_key.bind("<Return>", lambda e: self.next_from_key())

        btn = tk.Button(
            s, text="Далее", command=self.next_from_key,
            bg="#1f2a1f", fg=POLUNA_GREEN, font=("Consolas", 13, "bold"),
            activebackground="#2c3d2c", activeforeground="white", bd=2,
            relief="raised", padx=30, pady=6, cursor="hand2"
        )
        btn.pack(pady=8)

        self.widget(
            s, "Формат ключа: POLUNA-XXXX-XXXX-XXXX-XXXX", color=POLUNA_ORANGE,
            size=10, bold=False
        ).pack(pady=(18, 0))

    def next_from_key(self):
        key = (self.ent_key.get() if self.ent_key else "").strip().upper()
        if not KEY_RE.match(key):
            messagebox.showerror("Poluna", "Неверный формат ключа.\nОжидается POLUNA-XXXX-XXXX-XXXX-XXXX")
            return
        self.cfg["key"] = key
        save_config(self.cfg)
        self.show_step("auth")

    def step_auth(self):
        s = self.stage
        self.widget(s, "Введи свой логин и пароль с сайта.").pack(pady=(40, 4))
        self.widget(
            s, "Регистрация: poluna-client.github.io", color=POLUNA_GRAY,
            size=10, bold=False
        ).pack()

        self.widget(s, "Логин", color=POLUNA_BLUE, size=11).pack(pady=(26, 2))
        self.ent_login = tk.Entry(
            s, width=34, font=("Consolas", 13), fg="white",
            bg="#0b0b0c", insertbackground="white", justify="center"
        )
        self.ent_login.pack()
        self.ent_login.insert(0, self.cfg.get("login", ""))

        self.widget(s, "Пароль", color=POLUNA_BLUE, size=11).pack(pady=(16, 2))
        self.ent_pass = tk.Entry(
            s, width=34, font=("Consolas", 13), show="*", fg="white",
            bg="#0b0b0c", insertbackground="white", justify="center"
        )
        self.ent_pass.pack()
        self.ent_pass.bind("<Return>", lambda e: self.do_login())

        btn = tk.Button(
            s, text="ВОЙТИ", command=self.do_login,
            bg="#1f2a1f", fg=POLUNA_GREEN, font=("Consolas", 14, "bold"),
            activebackground="#2c3d2c", activeforeground="white", bd=2,
            relief="raised", padx=40, pady=8, cursor="hand2"
        )
        btn.pack(pady=26)

        self.widget(
            s, "Демо-проверка: сервер не подключён, но ключ и учётные данные проверяются.",
            color=POLUNA_ORANGE, size=10, bold=False
        ).pack()

    def do_login(self):
        login = (self.ent_login.get() or "").strip()
        pasw = (self.ent_pass.get() or "").strip()
        if len(login) < 3:
            messagebox.showerror("Poluna", "Логин слишком короткий.")
            return
        if len(pasw) < 4:
            messagebox.showerror("Poluna", "Пароль слишком короткий.")
            return

        # DEMO-проверка. Когда появится сервер, здесь будет POST /
        # api/verify с (key, login, password) и ответ сервера «ok».
        digest = hashlib.sha256((login + "::" + pasw).encode("utf-8")).hexdigest()[:8]
        self.cfg["login"] = login
        save_config(self.cfg)

        if not self.console:
            self.make_console()
        self.log("Подключение к poluna-cloud... ok")
        self.log("Ключ " + self.cfg.get("key", "")[:12] + "... принят")
        self.log("Профиль: " + login)
        self.log("Хэш сессии: " + digest)
        self.log("Модули загружены: KillAura, ESP, Speed, Bypass")
        self.log("ВХОД ВЫПОЛНЕН. Запуск игры...")
        self.log("")
        self.log("P O L U N A — добро пожаловать на борт!")

    def make_console(self):
        for w in self.stage.winfo_children():
            w.destroy()
        head = self.widget(self.stage, "P O L U N A  /  C O N S O L E", size=14)
        head.pack(pady=(30, 14))
        self.console = tk.Text(
            self.stage, width=70, height=14, font=("Consolas", 11),
            bg="#050505", fg=POLUNA_GREEN, insertbackground=POLUNA_GREEN,
            relief="flat", state="disabled", wrap="word"
        )
        self.console.pack(padx=24)

    def log(self, line):
        if not self.console:
            return
        self.console.configure(state="normal")
        self.console.insert("end", line + "\n")
        self.console.see("end")
        self.console.configure(state="disabled")


if __name__ == "__main__":
    root = tk.Tk()
    PolunaLauncher(root)
    root.mainloop()
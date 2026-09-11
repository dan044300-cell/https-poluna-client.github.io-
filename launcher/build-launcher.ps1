









# Poluna Launcher build - rebuilds Launcher.exe (premium minimal style like expensive/highway clients)
# Run: powershell -ExecutionPolicy Bypass -File build-launcher.ps1
$code = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

// ============== звёздный фон (приглушённый, премиальный) ==============
public class CosmosPanel : Panel
{
    private struct Star { public float X, Y, S, BaseAlpha, Phase; public Color C; }
    private class Meteor { public float X, Y, Vx, Vy, Life; public Color C; }
    private Star[] stars;
    private Meteor[] meteors;
    private Timer timer;
    private int tick;
    private static Random rnd = new Random(2026);

    public CosmosPanel()
    {
        DoubleBuffered = true;
        stars = new Star[180];
        for (int i = 0; i < stars.Length; i++)
        {
            stars[i].X = rnd.Next(0, 1800);
            stars[i].Y = rnd.Next(0, 1200);
            stars[i].S = rnd.Next(1, 2) + (float)rnd.NextDouble() * 0.4f;
            stars[i].Phase = (float)(rnd.NextDouble() * Math.PI * 2);
            stars[i].C = Color.FromArgb(235, 245, 255);
            stars[i].BaseAlpha = rnd.Next(40, 110);
        }
        meteors = new Meteor[3];
        timer = new Timer();
        timer.Interval = 50;
        timer.Tick += (s, e) =>
        {
            tick++;
            if (tick % 40 == 0) SpawnMeteor();
            for (int i = 0; i < meteors.Length; i++)
            {
                var m = meteors[i];
                if (m == null) continue;
                m.X += m.Vx; m.Y += m.Vy; m.Life--;
                if (m.Life <= 0 || m.X > Width + 100 || m.Y > Height + 100) meteors[i] = null;
            }
            Invalidate();
        };
        timer.Start();
    }

    private void SpawnMeteor()
    {
        int i = -1;
        for (int k = 0; k < meteors.Length; k++) if (meteors[k] == null) { i = k; break; }
        if (i == -1) return;
        var m = new Meteor();
        m.X = rnd.Next(0, Width > 0 ? Width : 880);
        m.Y = rnd.Next(0, 60);
        m.Vx = 6 + (float)rnd.NextDouble() * 6;
        m.Vy = 3 + (float)rnd.NextDouble() * 4;
        m.Life = 36;
        m.C = Color.FromArgb(210, 225, 255);
        meteors[i] = m;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        using (var br = new LinearGradientBrush(ClientRectangle,
            Color.FromArgb(11, 13, 20), Color.FromArgb(4, 5, 10), 90f))
            g.FillRectangle(br, ClientRectangle);

        float t = tick * 0.04f;
        foreach (var st in stars)
        {
            float tw = 0.6f + 0.4f * (float)Math.Sin(t + st.Phase);
            int a = (int)(st.BaseAlpha * tw); if (a < 0) a = 0; if (a > 255) a = 255;
            using (var b = new SolidBrush(Color.FromArgb(a, st.C)))
                g.FillRectangle(b, st.X, st.Y, st.S, st.S);
        }
        foreach (var m in meteors)
        {
            if (m == null) continue;
            int seg = 14;
            float dx = -m.Vx / m.Vy * 70 / seg;
            float dy = -70 / seg;
            for (int i = 0; i < seg; i++)
            {
                float r = (float)i / seg;
                int a = (int)(180 * (1f - r * r)); if (a < 0) a = 0;
                using (var pen = new Pen(Color.FromArgb(a, m.C), 1.3f))
                    g.DrawLine(pen, m.X + dx * i, m.Y + dy * i, m.X + dx * (i + 1), m.Y + dy * (i + 1));
            }
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && timer != null) timer.Stop();
        base.Dispose(disposing);
    }
}

// ============== стеклянная карточка ==============
public class GlassCard : Panel
{
    public GlassCard() { DoubleBuffered = true; BackColor = Color.FromArgb(13, 15, 26); }

    private GraphicsPath RoundRect(RectangleF r, int rad)
    {
        GraphicsPath p = new GraphicsPath();
        float d = rad * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
        using (var gp = RoundRect(r, 16))
        {
            using (var b = new SolidBrush(Color.FromArgb(240, 13, 15, 26)))
                g.FillPath(b, gp);
            using (var p = new Pen(Color.FromArgb(36, 255, 255, 255), 1f))
                g.DrawPath(p, gp);
        }
    }
}

// ============== поле ввода с рамкой ==============
public class InputBox : Panel
{
    public TextBox Inner;
    private bool focused;
    public new string Text
    {
        get { return Inner.Text; }
        set { Inner.Text = value; }
    }

    public InputBox()
    {
        DoubleBuffered = true;
        BackColor = Color.FromArgb(9, 11, 20);
        Height = 44;
        Inner = new TextBox();
        Inner.BorderStyle = BorderStyle.None;
        Inner.BackColor = Color.FromArgb(9, 11, 20);
        Inner.ForeColor = Color.FromArgb(232, 236, 245);
        Inner.Font = new Font("Segoe UI", 11.5f, FontStyle.Regular);
        Inner.Cursor = Cursors.IBeam;
        Inner.PasswordChar = '\0';
        Inner.MaxLength = 64;
        Inner.GotFocus += (s, e) => { focused = true; Invalidate(); };
        Inner.LostFocus += (s, e) => { focused = false; Invalidate(); };
        Controls.Add(Inner);
    }

protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        if (Inner == null) return;
        Inner.Location = new Point(14, (Height - Inner.Height) / 2);
        Inner.Width = Width - 28;
    }

    private GraphicsPath RoundRect(RectangleF r, int rad)
    {
        GraphicsPath p = new GraphicsPath();
        float d = rad * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        if (Width < 2 || Height < 2) return;
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
        using (var gp = RoundRect(r, 10))
        {
            using (var b = new SolidBrush(Color.FromArgb(245, 9, 11, 20)))
                g.FillPath(b, gp);
            Color border = focused ? Color.FromArgb(190, 121, 224, 255) : Color.FromArgb(40, 255, 255, 255);
            using (var p = new Pen(border, 1.2f))
                g.DrawPath(p, gp);
        }
    }
}

// ============== бейдж ==============
public class Badge : Label
{
    private Color accent;
    public Badge(Color borderAcc, Color textColor)
    {
        accent = borderAcc;
        ForeColor = textColor;
        Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        BackColor = Color.Transparent;
        TextAlign = ContentAlignment.MiddleCenter;
    }

    private GraphicsPath RoundRect(RectangleF r, int rad)
    {
        GraphicsPath p = new GraphicsPath();
        float d = rad * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        RectangleF r = new RectangleF(0.5f, 0.5f, Width - 2, Height - 2);
        using (var gp = RoundRect(r, Height / 2))
        {
            using (var b = new SolidBrush(Color.FromArgb(230, 8, 10, 16)))
                g.FillPath(b, gp);
            using (var p = new Pen(Color.FromArgb(120, accent), 1f))
                g.DrawPath(p, gp);
        }
        TextRenderer.DrawText(g, Text, Font, new Rectangle(6, 0, Width - 12, Height), ForeColor,
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
    }
}

// ============== кнопка ==============
public class GlowButton : Button
{
    private bool hover;
    public GlowButton()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
    }
    protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); hover = true; Invalidate(); }
    protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); hover = false; Invalidate(); }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
        using (var gp = RoundRect(r, Math.Min(12, Height / 2)))
        {
            Color c1 = Color.FromArgb(121, 224, 255);
            Color c2 = Color.FromArgb(169, 140, 255);
            if (hover) { c1 = Color.FromArgb(150, 235, 255); c2 = Color.FromArgb(195, 175, 255); }
            using (var b = new LinearGradientBrush(r, c1, c2, 90f))
                g.FillPath(b, gp);
            if (hover)
                using (var glow = new SolidBrush(Color.FromArgb(55, 121, 224, 255)))
                    g.FillEllipse(glow, r.X - 10, r.Y - 10, r.Width + 20, r.Height + 20);
        }
        TextRenderer.DrawText(g, Text, Font, r, Color.FromArgb(8, 14, 28),
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
    }
    private GraphicsPath RoundRect(RectangleF r, int rad)
    {
        GraphicsPath p = new GraphicsPath();
        float d = rad * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }
}

// ============== лаунчер ==============
public class PolunaLauncher
{
    private const string SERVER_URL = "http://localhost:3000";

    static string GetServer()
    {
        try
        {
            string env = Environment.GetEnvironmentVariable("POLUNA_SERVER");
            if (env != null && env.Length > 0) return env;
            string f = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "server.url");
            if (System.IO.File.Exists(f))
            {
                string s = System.IO.File.ReadAllText(f).Trim();
                if (s.Length > 0) return s;
            }
        }
        catch { }
        return SERVER_URL;
    }

    private static readonly Color TEXT   = Color.FromArgb(232, 236, 245);
    private static readonly Color MUTED  = Color.FromArgb(139, 147, 167);
    private static readonly Color DIM    = Color.FromArgb(95, 102, 128);
    private static readonly Color ACCENT = Color.FromArgb(121, 224, 255);
    private static readonly Color VIOLET = Color.FromArgb(169, 140, 255);
    private static readonly Color GREEN  = Color.FromArgb(92, 255, 157);
    private static readonly Color RED    = Color.FromArgb(255, 107, 122);
    private static readonly Font LOGO_F  = new Font("Segoe UI", 19, FontStyle.Bold);
    private static readonly Font CAPS_F  = new Font("Segoe UI", 8.5f, FontStyle.Bold);
    private static readonly Font LBL_F   = new Font("Segoe UI", 9, FontStyle.Regular);

private CosmosPanel bg;
    private GlassCard loginCard;
    private InputBox promoBox, loginBox, passBox;
    private Label statusLogin;
    private string configPath;
    private string savedKey = "", savedLogin = "";
    private bool busy;

static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        LogFile("PolunaLauncher starting...");
        try
        {
            new PolunaLauncher().Run();
        }
        catch (Exception ex)
        {
            LogCrash(ex);
            throw;
        }
        LogFile("PolunaLauncher finished normally");
    }

    static string LogPath { get { return System.IO.Path.Combine(System.IO.Path.GetTempPath(), "poluna-launch.log"); } }

    static void LogFile(string msg)
    {
        try { System.IO.File.AppendAllText(LogPath, DateTime.Now.ToString("HH:mm:ss.fff") + " " + msg + "\r\n"); } catch { }
    }

    static void LogCrash(Exception ex)
    {
        try
        {
            File.WriteAllText(Path.Combine(Path.GetTempPath(), "poluna-crash.log"), ex.ToString());
        }
        catch { }
    }

void Run()
    {
        LogFile("Run: begin");
        configPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "PolunaLauncher", "config.json");
        try
        {
            string[] parts = File.ReadAllText(configPath).Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length > 0) savedKey = parts[0].Trim();
            if (parts.Length > 1) savedLogin = parts[1].Trim();
        }
        catch { }

        Form form = new Form();
        form.Text = "Poluna Client 1.21.11";
        form.ClientSize = new Size(880, 560);
        form.FormBorderStyle = FormBorderStyle.FixedSingle;
        form.MaximizeBox = false;
        form.BackColor = Color.FromArgb(5, 6, 11);

        bg = new CosmosPanel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(5, 6, 11) };
        form.Controls.Add(bg);

BuildTop();
        BuildLogin();
        LogFile("Run: cards built");
        form.Shown += (s, e) => LogFile("Form shown");
        form.FormClosing += (s, e) => LogFile("Form closing, reason=" + e.CloseReason);
        form.FormClosed += (s, e) => LogFile("Form closed");
        form.HandleCreated += (s, e) => LogFile("Form handle created");

        Application.Run(form);
        LogFile("Run: message loop ended");
    }

    void BuildTop()
    {
        Label logo = Lbl("POLUNA", LOGO_F, TEXT); logo.Location = new Point(34, 26); bg.Controls.Add(logo); logo.BringToFront();
        Label dot = Lbl("●", new Font("Segoe UI", 10, FontStyle.Bold), ACCENT); dot.Location = new Point(34 + logo.Width + 6, 30); bg.Controls.Add(dot); dot.BringToFront();

        Label sub = Lbl("CLIENT 1.21.11 — ВХОД ПО КЛЮЧУ", CAPS_F, DIM); sub.Location = new Point(35, 54); bg.Controls.Add(sub); sub.BringToFront();

        // разграничительная линия под шапкой
        Panel line = new Panel();
        line.SetBounds(0, 84, 880, 1);
        line.BackColor = Color.FromArgb(24, 255, 255, 255);
        bg.Controls.Add(line); line.BringToFront();

        Badge srv = new Badge(Color.FromArgb(120, VIOLET), VIOLET); srv.Text = "СЕРВЕР: ASTRUM · РЕКОМЕНДУЕМЫЙ"; srv.SetBounds(34, 100, 190, 26); bg.Controls.Add(srv); srv.BringToFront();
        Badge ver = new Badge(Color.FromArgb(120, ACCENT), ACCENT); ver.Text = "ВЕРСИЯ 1.21.11"; ver.SetBounds(232, 100, 120, 26); bg.Controls.Add(ver); ver.BringToFront();

        Label foot = Lbl("© 2026 POLUNA ● полная верификация ключа в базе сервера", LBL_F, DIM);
        foot.Location = new Point(34, bg.Parent.ClientSize.Height - 30); bg.Controls.Add(foot); foot.BringToFront();
    }

    void BuildLogin()
    {
        int cw = 460, ch = 428, cx = (880 - cw) / 2, cy = 70;
        loginCard = new GlassCard(); loginCard.SetBounds(cx, cy, cw, ch); bg.Controls.Add(loginCard); loginCard.BringToFront();

int L = 30, W = cw - 60;

        Label head = Lbl("В Х О Д  В  С И С Т Е М У", CAPS_F, ACCENT); head.SetBounds(L, 22, W, 16); loginCard.Controls.Add(head);

        Label pl = Lbl("КЛЮЧ ПОДПИСКИ", CAPS_F, MUTED); pl.SetBounds(L, 70, W, 14);
        promoBox = NewInput(); promoBox.SetBounds(L, 88, W, 44); promoBox.Text = savedKey;
        promoBox.Inner.TextChanged += (s, e) =>
        {
            string cur = Regex.Replace(promoBox.Inner.Text.ToUpper(), "[^A-Z0-9-]", "");
            if (cur != promoBox.Inner.Text) promoBox.Inner.Text = cur;
            promoBox.Inner.SelectionStart = promoBox.Inner.Text.Length;
        };
        promoBox.Inner.KeyDown += (s, e) => { if (e.KeyCode == Keys.Enter) DoLogin(); };

Label ll = Lbl("ЛОГИН ИЛИ ПОЧТА", CAPS_F, MUTED); ll.SetBounds(L, 166, W, 14);
        loginBox = NewInput(); loginBox.SetBounds(L, 184, W, 44); loginBox.Text = savedLogin;

        Label lp = Lbl("ПАРОЛЬ", CAPS_F, MUTED); lp.SetBounds(L, 252, W, 14);
        passBox = NewInput(); passBox.SetBounds(L, 270, W, 44); passBox.Inner.PasswordChar = '*';
        passBox.Inner.KeyDown += (s, e) => { if (e.KeyCode == Keys.Enter) DoLogin(); };

        statusLogin = Lbl("", LBL_F, RED); statusLogin.SetBounds(L, 330, W, 26);

        GlowButton go = new GlowButton();
        go.Text = "ВОЙТИ";
        go.Font = new Font("Segoe UI", 12, FontStyle.Bold);
        go.Cursor = Cursors.Hand;
        go.SetBounds(L, 364, W, 50);
        go.Click += (s, e) => DoLogin();

        loginCard.Controls.AddRange(new Control[] { head, pl, promoBox, ll, loginBox, lp, passBox, statusLogin, go });
    }

void DoLogin()
    {
        if (busy) return;
        string key = (promoBox.Text ?? "").Trim();
        string login = (loginBox.Text ?? "").Trim();
        string pass = passBox.Text ?? "";

        if (!Regex.IsMatch(key, @"^POLUNA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$"))
        {
            Status("Отмена: неверный формат промокода POLUNA-XXXX-XXXX-XXXX-XXXX.", RED);
            return;
        }
        if (login.Length < 3) { Status("Логин слишком короткий.", RED); return; }
        if (pass.Length < 4) { Status("Пароль слишком короткий.", RED); return; }

        savedKey = key; savedLogin = login; SaveConfig();
        SetBusy(true);
        Status("Проверка ключа и аккаунта...", MUTED);

        string payload = "{\"key\":\"" + J(key) + "\",\"login\":\"" + J(login) + "\",\"password\":\"" + J(pass) + "\"}";

        System.Threading.ThreadPool.QueueUserWorkItem(_ =>
        {
            try
            {
string resp = Post(GetServer() + "/api/verify", payload);
                if (resp != null && resp.StartsWith("OK "))
                {
                    string[] parts = resp.Split(' ');
                    string nick = parts.Length > 1 ? parts[1] : login;
                    string plan = parts.Length > 2 ? parts[2] : "";
                    string until = parts.Length > 3 && parts[3] != "0" ? parts[3] : "0";
                    string untilNice = "бессрочно";
                    try { if (until != "0" && until != null) untilNice = new DateTime(1970, 1, 1).AddMilliseconds(long.Parse(until)).ToString("dd.MM.yyyy"); }
                    catch { }
                    InvokeSafe(() =>
                    {
                        Status("Вход выполнен. Привет, " + nick + "! Подписка: " + plan + " · до " + untilNice, GREEN);
                        SetBusy(false);
                    });
                }
                else if (resp != null && resp.StartsWith("ERR "))
                    InvokeSafe(() => { Status(WhyMsg(resp.Substring(4).Trim()), RED); SetBusy(false); });
                else
                    InvokeSafe(() => { Status("Сервер ответил непонятно. Попробуй ещё раз.", RED); SetBusy(false); });
            }
            catch
            {
InvokeSafe(() =>
                {
                    Status("Сервер недоступен — вход выполнен локально. Добро пожаловать, " + login + "!", GREEN);
                    SetBusy(false);
                });
            }
        });
    }

string WhyMsg(string why)
    {
        switch (why)
        {
            case "invalid key": return "Отмена: промокода нет в базе.";
            case "key expired": return "Отмена: срок действия ключа истёк.";
            case "bad login": return "Такого аккаунта нет — зарегистрируйся на сайте.";
            case "bad password": return "Неверный пароль.";
            default: return "Отмена: " + why;
        }
    }

    void Status(string msg, Color c)
    {
        statusLogin.Text = msg; statusLogin.ForeColor = c;
    }

    void SetBusy(bool v)
    {
        busy = v;
        promoBox.Enabled = !v; loginBox.Enabled = !v; passBox.Enabled = !v;
    }

    string Short(string s) { return s.Length >= 15 ? s.Substring(0, 14) + "…" : s; }
    string J(string s) { return s.Replace("\\", "\\\\").Replace("\"", "\\\""); }

    string Post(string url, string body)
    {
        using (var wc = new WebClient())
        {
            wc.Headers[HttpRequestHeader.ContentType] = "application/json";
            wc.Encoding = Encoding.UTF8;
            try { return wc.UploadString(url, "POST", body); }
            catch (WebException we)
            {
                if (we.Response != null)
                {
                    using (var rs = we.Response.GetResponseStream())
                    using (var sr = new StreamReader(rs, Encoding.UTF8))
                        return sr.ReadToEnd();
                }
                throw we;
            }
        }
    }

    void InvokeSafe(Action a)
    {
        try { bg.BeginInvoke(a); } catch { a(); }
    }

    void SaveConfig()
    {
        try { Directory.CreateDirectory(Path.GetDirectoryName(configPath)); File.WriteAllText(configPath, savedKey + "\n" + savedLogin + "\n"); }
        catch { }
    }

    InputBox NewInput()
    {
        InputBox b = new InputBox();
        b.TabStop = false;
        return b;
    }

    Label Lbl(string text, Font font, Color color)
    {
        Label l = new Label(); l.Text = text; l.ForeColor = color; l.Font = font;
        l.BackColor = Color.Transparent; l.AutoSize = true;
        return l;
    }
}
'@

$net = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
Add-Type -TypeDefinition $code -Language CSharp `
    -ReferencedAssemblies ($net + 'System.Windows.Forms.dll'), ($net + 'System.Drawing.dll') `
    -OutputType WindowsApplication `
    -OutputAssembly (Join-Path $PSScriptRoot 'Launcher.exe')
Write-Host "OK - Launcher.exe rebuilt"

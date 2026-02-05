from flask import Flask, render_template, jsonify, request
import pyodbc
from datetime import datetime

# ==============================================================================
#  CONFIGURAÇÕES DE DESENVOLVIMENTO
# ==============================================================================

# SE TRUE: Usa dados falsos (rápido, não conecta no banco, ideal para testar layout)
# SE FALSE: Conecta no banco da empresa (lento, dados reais)
MODO_OFFLINE = True  

app = Flask(__name__)

# Configurações do Banco Real
DADOS_CONEXAO = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=FAC-DB53.facta.com.br;"
    "Database=Facta_01_BaseDados;"
    "Trusted_Connection=yes;"
    "ApplicationIntent=ReadOnly;"
)
IDS_EQUIPE = "20269, 19515, 18676, 17979, 13424, 16329, 8176, 9349, 15916, 20188, 15711, 19321, 19652, 16786, 11496"

VIDEOS_RANK = {
    10: "ironVid", 15: "bronzeVid", 35: "goldVid", 70: "diamondVid",
    90: "misticoVid", 130: "masterVid", 190: "grandmasterVid",
    260: "legendVid", 350: "devilVid"
}

# ==============================================================================
#  DADOS FALSOS (MOCK) - Para testar sem banco
# ==============================================================================
MOCK_PERFIL = {
    "nome": "USUÁRIO TESTE DEV",
    "total": 65,  # Mude aqui para testar diferentes vídeos (ex: 10, 90, 300)
    "meta": 90
}

MOCK_LEADERBOARD = [
    {"nome": "JOÃO SILVA", "pontos": 150},
    {"nome": "MARIA DEV", "pontos": 120},
    {"nome": "PEDRO MOSER", "pontos": 65},
    {"nome": "TESTE 4", "pontos": 40},
    {"nome": "TESTE 5", "pontos": 10}
]

# ==============================================================================
#  LÓGICA
# ==============================================================================

def get_db_connection():
    return pyodbc.connect(DADOS_CONEXAO)

def calcular_elo_e_meta(qtd):
    if qtd <= 9: return "unranked", 10
    elif qtd <= 14: return "iron", 15
    elif qtd <= 34: return "bronze", 35
    elif qtd <= 64: return "gold", 65
    elif qtd <= 89: return "diamond", 90
    elif qtd <= 129: return "mistico", 130
    elif qtd <= 189: return "master", 190
    elif qtd <= 259: return "grandmaster", 260
    elif qtd <= 349: return "legend", 350
    else: return "devil", 350

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/perfil/<int:user_id>')
def get_perfil(user_id):
    # --- MODO OFFLINE ---
    if MODO_OFFLINE:
        nome = MOCK_PERFIL["nome"]
        total = MOCK_PERFIL["total"]
        elo, meta = calcular_elo_e_meta(total)
        return jsonify({
            "nome": nome, "total": total, "meta": meta, "elo": elo,
            "video": VIDEOS_RANK.get(total, None)
        })

    # --- MODO ONLINE (BANCO REAL) ---
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = f"SELECT F.NOME, COUNT(PS.CODIGO) FROM FL_FUNCIONARIO F LEFT JOIN PORTAL_SOLICITACAO PS ON F.codigo = PS.codResponsavel AND PS.codStatus = 3 AND PS.data >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) WHERE F.codigo = {user_id} GROUP BY F.NOME"
        cursor.execute(query)
        res = cursor.fetchone()
        conn.close()

        if res:
            nome, total = res[0], res[1]
            elo, meta = calcular_elo_e_meta(total)
            return jsonify({
                "nome": nome, "total": total, "meta": meta, "elo": elo,
                "video": VIDEOS_RANK.get(total, None)
            })
        return jsonify({"error": "Usuário não encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/leaderboard')
def get_leaderboard():
    lista_final = []

    # --- MODO OFFLINE ---
    if MODO_OFFLINE:
        for item in MOCK_LEADERBOARD:
            elo, _ = calcular_elo_e_meta(item["pontos"])
            lista_final.append({"nome": item["nome"], "pontos": item["pontos"], "elo": elo})
        return jsonify(lista_final)

    # --- MODO ONLINE (BANCO REAL) ---
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = f"SELECT F.NOME, COUNT(PS.CODIGO) FROM FL_FUNCIONARIO F LEFT JOIN PORTAL_SOLICITACAO PS ON F.codigo = PS.codResponsavel AND PS.codStatus = 3 AND PS.data >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) WHERE F.codigo IN ({IDS_EQUIPE}) GROUP BY F.NOME ORDER BY 2 DESC"
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()

        for row in rows:
            elo, _ = calcular_elo_e_meta(row[1])
            lista_final.append({"nome": row[0], "pontos": row[1], "elo": elo})
        
        return jsonify(lista_final)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/historico')
def get_historico():
    # --- MODO OFFLINE ---
    if MODO_OFFLINE:
        # Retorna dados falsos aleatórios só para ver a tela funcionando
        mock_hist = [
            {"nome": "LENDA DO PASSADO", "pontos": 300},
            {"nome": "ANTIGO CAMPEÃO", "pontos": 250},
            {"nome": "VETERANO", "pontos": 180}
        ]
        lista = []
        for item in mock_hist:
            elo, _ = calcular_elo_e_meta(item["pontos"])
            lista.append({"nome": item["nome"], "pontos": item["pontos"], "elo": elo})
        return jsonify(lista)

    # --- MODO ONLINE (BANCO REAL) ---
    ano = request.args.get('ano')
    mes = request.args.get('mes')
    if not ano or not mes: return jsonify({"error": "Faltam parâmetros"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = f"SELECT TOP 3 F.NOME, COUNT(PS.CODIGO) FROM FL_FUNCIONARIO F JOIN PORTAL_SOLICITACAO PS ON F.codigo = PS.codResponsavel WHERE PS.codStatus = 3 AND F.codigo IN ({IDS_EQUIPE}) AND YEAR(PS.data) = ? AND MONTH(PS.data) = ? GROUP BY F.NOME ORDER BY 2 DESC"
        cursor.execute(query, (ano, mes))
        rows = cursor.fetchall()
        conn.close()

        lista = []
        for row in rows:
            elo, _ = calcular_elo_e_meta(row[1])
            lista.append({"nome": row[0], "pontos": row[1], "elo": elo})
        return jsonify(lista)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # SE O MODO OFFLINE ESTIVER ATIVO, USAMOS O LIVERELOAD
    # ISSO ATUALIZA O NAVEGADOR AUTOMATICAMENTE
    if MODO_OFFLINE:
        try:
            from livereload import Server
            server = Server(app.wsgi_app)
            print("--- MODO OFFLINE ATIVO: DADOS FALSOS + HOT RELOAD ---")
            server.watch('templates/*.html')
            server.watch('static/**/*.*')
            server.serve(host='127.0.0.1', port=5000)
        except ImportError:
            print("ERRO: Instale o livereload com 'pip install livereload'")
            app.run(debug=True)
    else:
        # SE FOR MODO ONLINE (PRODUÇÃO/TESTE REAL), RODA NORMAL
        print("--- MODO ONLINE: CONECTADO AO BANCO REAL ---")
        app.run(host='0.0.0.0', port=5000, debug=False)
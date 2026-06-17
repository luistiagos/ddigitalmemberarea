import json
import random

nomes = [
    "João", "Maria", "Pedro", "Ana", "Lucas", "Mariana", "Gabriel", "Julia", 
    "Matheus", "Beatriz", "Rafael", "Laura", "Guilherme", "Luiza", "Felipe", 
    "Fernanda", "Thiago", "Camila", "Bruno", "Amanda", "Gustavo", "Letícia", 
    "Rodrigo", "Bruna", "Fernando", "Jessica", "Marcelo", "Larissa", "Ricardo", 
    "Carolina", "Eduardo", "Natália", "Diego", "Aline", "Renato", "Patrícia", 
    "Leonardo", "Juliana", "Carlos", "Vanessa", "Daniel", "Tatiana", "Paulo", 
    "Priscila", "Marcos", "Gabriela", "André", "Thais", "Alexandre", "Isabela",
    "Roberto", "Luiz", "Bianca", "Antônio", "Daniela", "José", "Sabrina",
    "Vinícius", "Cíntia", "Fábio", "Renata", "Mônica", "Sérgio", "Erika"
]

sobrenomes = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", 
    "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", 
    "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", 
    "Dias", "Nascimento", "Andrade", "Moreira", "Nunes", "Marques", "Machado", 
    "Mendes", "Freitas", "Cardoso", "Ramos", "Gonçalves", "Santana", "Teixeira",
    "Moura", "Castro", "Melo", "Neves", "Correia", "Campos", "Barros", "Maciel"
]

templates = [
    "Adorei a qualidade das figurinhas, imprimi em papel adesivo fotográfico e ficou perfeito!",
    "Muito mais barato do que comprar os pacotinhos na banca. Meu filho amou.",
    "Baixei o PDF na hora e já começamos a imprimir. Excelente resolução.",
    "Vem todas as 48 seleções mesmo! A qualidade da imagem é muito boa.",
    "Perfeito para colecionar sem gastar uma fortuna. Recomendo muito.",
    "Instruções muito fáceis. Imprimi na gráfica aqui perto e as cores ficaram vivas.",
    "Incrível ter os jogadores lendários também. Meu álbum já está quase completo.",
    "O download foi imediato. Já estou cortando as figurinhas pra colar.",
    "As cartas especiais são lindas. Ótimo material.",
    "Excelente custo-benefício. Teria gastado centenas de reais comprando os pacotes.",
    "Imprimi na impressora de casa mesmo com papel normal e ficou ótimo.",
    "A divisão por seleções facilita muito a impressão. Parabéns pela organização.",
    "Chegou rapidinho no e-mail, os arquivos são muito bem organizados.",
    "Comprei para os meus filhos e eles estão se divertindo muito cortando e colando.",
    "A qualidade do PDF é impressionante, não perde a resolução ao imprimir.",
    "As fotos dos jogadores estão super atualizadas. Muito bom!",
    "Estava esperando por isso! Economizei muito dinheiro com esse pacote digital.",
    "Até as figurinhas brilhantes ficam legais impressas. Muito satisfeito.",
    "Material excelente. Superou minhas expectativas.",
    "O melhor kit digital da Copa que eu já vi. Valeu a pena.",
    "Comprei de presente pro meu sobrinho e ele não larga mais o álbum.",
    "Gostei muito da promessa de atualizações futuras gratuitas.",
    "Mais de 900 figurinhas! É conteúdo que não acaba mais.",
    "Recomendo a todos. A arte é maravilhosa e os cortes ficam perfeitos.",
    "Muito fácil de imprimir. Qualquer gráfica rápida faz o serviço.",
    "As cartas dos astros do futebol são as preferidas do meu filho.",
    "Tudo muito claro e bem explicado no PDF. Nota 10.",
    "Excelente alternativa aos álbuns físicos tradicionais, muito mais acessível.",
    "Imprimi algumas páginas pra testar e já quero imprimir todas!",
    "Minha coleção da Copa está garantida graças a esse arquivo.",
    "A qualidade do design das figurinhas é de cair o queixo.",
    "Produto fantástico, já imprimi todas as seleções sul-americanas.",
    "Muito seguro e a entrega digital foi instantânea.",
    "Vale cada centavo. Ter as 48 seleções completas é bom demais.",
    "O arquivo é grande mas baixa rapidinho, resolução top de linha.",
    "Melhor compra que fiz esse ano, a diversão com a família está garantida.",
    "Nunca foi tão fácil completar o álbum da Copa!",
    "O layout dos PDFs ajuda muito a não desperdiçar papel na hora de imprimir.",
    "As fotos em grupo das seleções ficaram espetaculares.",
    "Tinha minhas dúvidas mas a impressão ficou impecável, nota 1000."
]


depoimentos = []
for i in range(100):
    nome = f"{random.choice(nomes)} {random.choice(sobrenomes)}"
    stars = random.randint(4, 5)
    text = random.choice(templates)
    depoimentos.append({"name": nome, "stars": stars, "text": text})

output_path = 'e:/products/Worldcup/World Cup 2026 _ Stickers-20260615T174159Z-3-001/depoimentos_worldcup.json'

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(depoimentos, f, ensure_ascii=False, indent=2)

print(f"Gerado com sucesso em {output_path}")

# -*- coding: utf-8 -*-
"""Scaniha investor PDFs — French + Arabic (RTL). Correct pricing from
lib/payment-config.ts: Menu QR 1 an 150 / À vie 250 ; Fidélité 50 / an.
Output: Desktop/Scaniha - Investisseurs/."""
import os
from functools import partial
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_JUSTIFY, TA_RIGHT, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, HRFlowable
import arabic_reshaper
from bidi.algorithm import get_display

ORANGE = HexColor('#F47B20'); ORANGE_D = HexColor('#B45309'); ORANGE_L = HexColor('#FBEADB')
INK = HexColor('#1C1917'); GRAY = HexColor('#57534E'); LINE = HexColor('#E7E1D8')
OUT = os.path.join(os.path.expanduser('~'), 'Desktop', 'Scaniha - Investisseurs')
os.makedirs(OUT, exist_ok=True)

pdfmetrics.registerFont(TTFont('Ar', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('ArB', r'C:\Windows\Fonts\arialbd.ttf'))

def ar(s):
    return get_display(arabic_reshaper.reshape(s), base_dir='R')

def hf(canvas, doc, title, rtl=False):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(ORANGE); canvas.rect(0, h - 1.15 * cm, w, 1.15 * cm, fill=1, stroke=0)
    canvas.setFillColor(white); canvas.setFont('Helvetica-Bold', 13); canvas.drawString(2 * cm, h - 0.8 * cm, 'SCANIHA')
    canvas.setFont('ArB' if rtl else 'Helvetica', 10 if rtl else 9); canvas.drawRightString(w - 2 * cm, h - 0.78 * cm, title)
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.5); canvas.line(2 * cm, 1.45 * cm, w - 2 * cm, 1.45 * cm)
    canvas.setFillColor(GRAY); canvas.setFont('Helvetica', 7.3)
    canvas.drawString(2 * cm, 1.13 * cm, 'Scaniha — Rakiza Group  ·  support@scaniha.com  ·  +216 51 089 100  ·  scaniha.com')
    canvas.drawRightString(w - 2 * cm, 1.13 * cm, 'Page %d' % doc.page)
    canvas.restoreState()

def build(path, title, story, rtl=False):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.95 * cm, bottomMargin=1.8 * cm, title=title)
    f = partial(hf, title=title, rtl=rtl)
    doc.build(story, onFirstPage=f, onLaterPages=f)
    print('OK', os.path.basename(path))

# ─────────── style factories ───────────
def styles(rtl):
    fn, fb = ('Ar', 'ArB') if rtl else ('Helvetica', 'Helvetica-Bold')
    al = TA_RIGHT if rtl else TA_JUSTIFY
    return {
        'h1': ParagraphStyle('h1', fontName=fb, fontSize=20, textColor=INK, leading=24, spaceAfter=2, alignment=TA_RIGHT if rtl else TA_LEFT),
        'tag': ParagraphStyle('tag', fontName=fn, fontSize=10.5, textColor=ORANGE_D, leading=15, spaceAfter=2, alignment=TA_RIGHT if rtl else TA_LEFT),
        'h2': ParagraphStyle('h2', fontName=fb, fontSize=12.5, textColor=ORANGE, leading=16, spaceBefore=14, spaceAfter=5, alignment=TA_RIGHT if rtl else TA_LEFT),
        'body': ParagraphStyle('body', fontName=fn, fontSize=9.7, textColor=INK, leading=15.5 if rtl else 14.5, alignment=al, spaceAfter=4),
        'bul': ParagraphStyle('bul', fontName=fn, fontSize=9.7, textColor=INK, leading=15.5 if rtl else 14, alignment=al, spaceAfter=4),
        'small': ParagraphStyle('small', fontName=fn, fontSize=8.3, textColor=GRAY, leading=13, spaceBefore=3, alignment=al),
        'callh': ParagraphStyle('callh', fontName=fb, fontSize=12, textColor=ORANGE_D, leading=16, alignment=TA_RIGHT if rtl else TA_LEFT),
        'cellh': ParagraphStyle('cellh', fontName=fb, fontSize=8.8, textColor=white, leading=12, alignment=TA_RIGHT if rtl else TA_LEFT),
        'cell': ParagraphStyle('cell', fontName=fn, fontSize=9, textColor=INK, leading=13, alignment=TA_RIGHT if rtl else TA_LEFT),
        'cellb': ParagraphStyle('cellb', fontName=fb, fontSize=9, textColor=INK, leading=13, alignment=TA_RIGHT if rtl else TA_LEFT),
    }

def mk(rtl):
    S = styles(rtl)
    T = (lambda s: ar(s)) if rtl else (lambda s: s)

    def para(s, st='body'): return Paragraph(T(s), S[st])
    def ch(s): return Paragraph(T(s), S['cellh'])
    def cc(s, b=False): return Paragraph(T(s), S['cellb' if b else 'cell'])

    def tbl(rows, widths):
        data = [[c for c in (reversed(r) if rtl else r)] for r in rows]
        w = list(reversed(widths)) if rtl else widths
        t = Table(data, colWidths=w, hAlign='RIGHT' if rtl else 'LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ORANGE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#FBF8F4')]),
            ('LINEBELOW', (0, 1), (-1, -1), 0.4, LINE),
        ]))
        return t

    def bullets(items):
        if rtl:
            return [Paragraph(ar('•  ' + it), S['bul']) for it in items]
        return [ListFlowable([Paragraph(it, S['bul']) for it in items], bulletType='bullet', start='•', bulletColor=ORANGE, bulletFontSize=9, leftIndent=14, spaceBefore=1, spaceAfter=5)]

    def callout(flows):
        t = Table([[flows]], colWidths=[17 * cm], hAlign='LEFT')
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), ORANGE_L),
                               ('LEFTPADDING', (0, 0), (-1, -1), 13), ('RIGHTPADDING', (0, 0), (-1, -1), 13),
                               ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                               (('LINEAFTER' if rtl else 'LINEBEFORE'), (0, 0), (0, -1) if not rtl else (-1, -1), 3, ORANGE)]))
        return t

    return S, para, ch, cc, tbl, bullets, callout

# ─────────── content (FR + AR) ───────────
C = {
 'fr': {
  'doc_title': 'Dossier investisseur', 'h1': 'Dossier investisseur',
  'tag': 'Le menu QR + fidélité pensé pour les cafés et restaurants tunisiens.',
  'enbref_h': 'En bref', 'enbref': "Scaniha transforme le menu papier d'un établissement en menu QR numérique élégant — modifiable en temps réel — et y ajoute un programme de fidélité (points, roue de la chance, récompenses) qui fait revenir les clients. Sans application, prix en dinars.",
  'pb_h': 'Le problème', 'pb': ["Des menus papier figés, coûteux à réimprimer à chaque changement de prix ou de plat.", "Aucune donnée client et aucun moyen simple de fidéliser sa clientèle.", "Les solutions étrangères sont chères, en anglais et inadaptées au marché tunisien."],
  'sol_h': 'La solution', 'sol_i': "Une plateforme web tout-en-un, accessible d'un simple scan :", 'sol': ["Menu QR — une carte numérique au design soigné, mise à jour instantanément, 4 styles au choix.", "Programme de fidélité — points à chaque achat, roue de la chance « tout le monde gagne », récompenses et carte client liée au numéro de téléphone.", "Connexion possible à une caisse / un outil tiers."],
  'march_h': 'Le marché', 'march': "La Tunisie compte des dizaines de milliers de cafés, salons de thé et restaurants, dont une infime minorité est équipée d'outils numériques. Cible immédiate : ________________ (ville / région).",
  'modele_h': 'Modèle économique', 'modele': "Des revenus récurrents et des paiements « à vie », avec des marges très élevées (logiciel, infrastructure quasi gratuite) :",
  'price': [['Produit', 'Tarifs'], ['Menu QR', '1 an : 150 TND   ·   À vie : 250 TND'], ['Programme de fidélité', '1 an : 50 TND']],
  'tract_h': 'Traction', 'tract_s': "À compléter avec vos chiffres réels — c'est ce qui convainc un investisseur.",
  'tract': [['Indicateur', 'Valeur'], ['Cafés inscrits', '________'], ['Cafés payants', '________'], ['Revenu mensuel actuel', '________ TND'], ['Produit', 'En ligne et fonctionnel']],
  'dem_h': 'La demande', 'dem_call_h': '2 000 TND — 100 % marketing', 'dem_call': "Pour acquérir les premiers cafés payants. Répartition indicative ci-dessous.",
  'funds': [['Poste', 'Budget'], ['Création de contenu (vidéos, photos)', '~ 700 TND'], ['Publicités (Instagram, Facebook, TikTok)', '~ 1 000 TND'], ['Outils + créateurs / UGC', '~ 300 TND']],
  'deal_h': 'Le deal — partage de revenus', 'deal': "Sans cession de parts. L'investisseur ne devient pas associé : il finance la campagne marketing et reçoit, en échange, une part des revenus futurs pendant une durée limitée, jusqu'à récupérer un multiple de sa mise. Plus la mise est élevée, plus le multiple l'est.",
  'deal_b': ["Scaniha affecte 20 % de ses revenus nets mensuels à un « pool investisseurs ».", "La part de chaque investisseur = sa mise ÷ 2 000 TND (total de la levée).", "Versement chaque mois jusqu'au plafond, ou 36 mois maximum — au premier des deux termes.", "Capital d'abord : les premiers versements remboursent la mise, puis viennent les primes.", "Transparence : un relevé de revenus est communiqué chaque mois."],
  'tiers': [['Mise', 'Multiple', "Récupère jusqu'à", 'Statut'], ['250 TND', '1,8×', '450 TND', 'Soutien'], ['500 TND', '2,0×', '1 000 TND', 'Partenaire'], ['1 000 TND', '2,3×', '2 300 TND', 'Partenaire +'], ['2 000 TND', '2,5×', '5 000 TND', 'Partenaire fondateur']],
  'ex': "Exemple — une mise de 500 TND (25 % de la levée) : un mois où Scaniha réalise 1 000 TND de revenus nets, le pool est de 200 TND et l'investisseur touche 25 % = 50 TND. À mesure que les revenus croissent, le versement mensuel augmente, jusqu'à 1 000 TND reçus au total (plafond 2,0×).",
  'now_h': 'Pourquoi maintenant', 'now': "Le produit est prêt et en ligne. Il ne manque que le carburant marketing pour passer de « fonctionnel » à « rentable ». Chaque dinar investi va directement à l'acquisition de clients payants.",
  'contact_h': 'Contact', 'contact': "________________ (nom)   ·   ________________ (téléphone)   ·   ________________ (email)",
  'risk': "Investissement à risque sur une jeune entreprise. Le rendement dépend de la croissance de l'activité et n'est pas garanti ; l'investisseur peut ne pas récupérer l'intégralité de sa mise.",
 },
 'ar': {
  'doc_title': 'ملف المستثمرين', 'h1': 'ملف المستثمرين',
  'tag': 'قائمة طعام رقمية عبر QR مع برنامج ولاء، مصمَّمة للمقاهي والمطاعم التونسية.',
  'enbref_h': 'باختصار', 'enbref': "تحوِّل Scaniha قائمة الطعام الورقية إلى قائمة QR رقمية أنيقة، قابلة للتعديل فورًا، مع برنامج ولاء (نقاط، عجلة الحظ، مكافآت) يُعيد الزبائن. دون الحاجة إلى تطبيق، والأسعار بالدينار التونسي.",
  'pb_h': 'المشكلة', 'pb': ["قوائم ورقية جامدة ومكلفة لإعادة الطباعة عند كل تغيير في الأسعار أو الأطباق.", "لا توجد بيانات عن الزبائن ولا وسيلة بسيطة للحفاظ على ولائهم.", "الحلول الأجنبية باهظة الثمن، بالإنجليزية، وغير ملائمة للسوق التونسية."],
  'sol_h': 'الحل', 'sol_i': "منصّة ويب متكاملة، يتم الوصول إليها بمسح بسيط:", 'sol': ["قائمة QR — بطاقة رقمية بتصميم أنيق، تُحدَّث فورًا، مع 4 أنماط للاختيار.", "برنامج ولاء — نقاط عند كل عملية شراء، عجلة حظ « الجميع يربح »، مكافآت، وبطاقة زبون مرتبطة برقم الهاتف.", "إمكانية الربط بصندوق الدفع أو أداة خارجية."],
  'march_h': 'السوق', 'march': "تضمّ تونس عشرات الآلاف من المقاهي وقاعات الشاي والمطاعم، أغلبها غير مجهّز رقميًا. الهدف المباشر: ________________ (المدينة / الجهة).",
  'modele_h': 'النموذج الاقتصادي', 'modele': "إيرادات متكرّرة ودفعات « مدى الحياة »، بهوامش ربح مرتفعة جدًا (برمجيات، بنية تحتية شبه مجانية):",
  'price': [['المنتج', 'الأسعار'], ['قائمة QR', 'سنة: 150 د.ت   ·   مدى الحياة: 250 د.ت'], ['برنامج الولاء', 'سنة: 50 د.ت']],
  'tract_h': 'الإنجازات', 'tract_s': "تُملأ بأرقامك الحقيقية — وهي ما يُقنع المستثمر.",
  'tract': [['المؤشر', 'القيمة'], ['المقاهي المسجَّلة', '________'], ['المقاهي الدافعة', '________'], ['الإيراد الشهري الحالي', '________ د.ت'], ['المنتج', 'متاح وجاهز للعمل']],
  'dem_h': 'الطلب', 'dem_call_h': '2 000 د.ت — 100% للتسويق', 'dem_call': "لاكتساب أوّل المقاهي الدافعة. توزيع تقريبي أدناه.",
  'funds': [['البند', 'الميزانية'], ['إنشاء المحتوى (فيديوهات، صور)', '~ 700 د.ت'], ['إعلانات (إنستغرام، فيسبوك، تيك توك)', '~ 1 000 د.ت'], ['أدوات + صنّاع محتوى', '~ 300 د.ت']],
  'deal_h': 'الاتفاق — اقتسام الإيرادات', 'deal': "دون التنازل عن أي حصص. لا يصبح المستثمر شريكًا: بل يموّل الحملة التسويقية ويحصل في المقابل على حصة من الإيرادات المستقبلية لمدة محدودة، إلى أن يسترجع مضاعفًا لمبلغه. كلّما زاد المبلغ، ارتفع المضاعف.",
  'deal_b': ["تخصّص Scaniha 20% من إيراداتها الصافية الشهرية لـ « محفظة المستثمرين ».", "حصة كل مستثمر = مبلغه ÷ 2 000 د.ت (إجمالي التمويل).", "دفعة كل شهر إلى بلوغ السقف، أو 36 شهرًا كحدّ أقصى — أيّهما أوّلًا.", "رأس المال أوّلًا: الدفعات الأولى تُرجِع المبلغ، ثم تأتي الأرباح.", "الشفافية: كشف بالإيرادات يُرسَل كل شهر."],
  'tiers': [['المبلغ', 'المضاعف', 'يسترجع حتى', 'الصفة'], ['250 د.ت', '1.8×', '450 د.ت', 'داعم'], ['500 د.ت', '2.0×', '1 000 د.ت', 'شريك'], ['1 000 د.ت', '2.3×', '2 300 د.ت', 'شريك +'], ['2 000 د.ت', '2.5×', '5 000 د.ت', 'شريك مؤسِّس']],
  'ex': "مثال — مبلغ 500 د.ت (25% من التمويل): في شهر تحقّق فيه Scaniha 1 000 د.ت إيرادًا صافيًا، تكون المحفظة 200 د.ت ويحصل المستثمر على 25% = 50 د.ت. ومع نمو الإيرادات ترتفع الدفعة الشهرية، إلى أن يستلم 1 000 د.ت إجمالًا (سقف 2.0×).",
  'now_h': 'لماذا الآن', 'now': "المنتج جاهز ومتاح على الإنترنت. لا ينقص سوى وقود التسويق للانتقال من « جاهز » إلى « مُربح ». كل دينار يُستثمَر يذهب مباشرة إلى اكتساب زبائن دافعين.",
  'contact_h': 'للتواصل', 'contact': "________________ (الاسم)   ·   ________________ (الهاتف)   ·   ________________ (البريد)",
  'risk': "استثمار محفوف بالمخاطر في مشروع ناشئ. العائد مرتبط بنمو النشاط وغير مضمون؛ وقد لا يسترجع المستثمر كامل مبلغه.",
 },
}

def dossier(lang):
    d = C[lang]; rtl = lang == 'ar'
    S, para, ch, cc, tbl, bullets, callout = mk(rtl)
    st = []
    st += [para(d['h1'], 'h1'), para(d['tag'], 'tag'), HRFlowable(width='100%', thickness=1, color=ORANGE, spaceBefore=6, spaceAfter=2)]
    st += [para(d['enbref_h'], 'h2'), para(d['enbref'])]
    st += [para(d['pb_h'], 'h2')] + bullets(d['pb'])
    st += [para(d['sol_h'], 'h2'), para(d['sol_i'])] + bullets(d['sol'])
    st += [para(d['march_h'], 'h2'), para(d['march'])]
    st += [para(d['modele_h'], 'h2'), para(d['modele']), tbl([[ch(d['price'][0][0]), ch(d['price'][0][1])]] + [[cc(r[0], True), cc(r[1])] for r in d['price'][1:]], [5.4 * cm, 11.6 * cm])]
    st += [para(d['tract_h'], 'h2'), para(d['tract_s'], 'small'), Spacer(1, 4), tbl([[ch(d['tract'][0][0]), ch(d['tract'][0][1])]] + [[cc(r[0]), cc(r[1], r[0] in ('Produit', 'المنتج'))] for r in d['tract'][1:]], [9 * cm, 8 * cm])]
    st += [para(d['dem_h'], 'h2'), callout([para(d['dem_call_h'], 'callh'), Spacer(1, 3), Paragraph((ar(d['dem_call']) if rtl else d['dem_call']), S['cell'] if rtl else ParagraphStyle('x', fontName='Helvetica', fontSize=9.4, textColor=INK, leading=13.5))]), Spacer(1, 7)]
    st += [tbl([[ch(d['funds'][0][0]), ch(d['funds'][0][1])]] + [[cc(r[0]), cc(r[1])] for r in d['funds'][1:]], [12 * cm, 5 * cm])]
    st += [para(d['deal_h'], 'h2'), para(d['deal'])] + bullets(d['deal_b'])
    st += [Spacer(1, 3), tbl([[ch(c) for c in d['tiers'][0]]] + [[cc(r[0], True), cc(r[1]), cc(r[2]), cc(r[3])] for r in d['tiers'][1:]], [3.5 * cm, 2.6 * cm, 5.4 * cm, 5.5 * cm])]
    st += [para(d['ex'], 'small')]
    st += [para(d['now_h'], 'h2'), para(d['now'])]
    st += [para(d['contact_h'], 'h2'), para(d['contact']), Spacer(1, 6), para(d['risk'], 'small')]
    suffix = 'AR' if rtl else 'FR'
    build(os.path.join(OUT, 'Scaniha - Dossier investisseur (%s).pdf' % suffix), d['doc_title'], st, rtl)

# ─────────── Contract content ───────────
K = {
 'fr': {'title': 'Contrat de partage de revenus', 'sub': 'Modèle — à adapter et faire signer en deux exemplaires.',
   'arts': [
    ('Entre les soussignés', "L'Éditeur : Scaniha, édité par Rakiza Group, représenté par ________________________, ci-après « l'Éditeur » ; et l'Investisseur : ________________________, CIN n° ____________, demeurant à ________________________, ci-après « l'Investisseur »."),
    ('Article 1 — Objet', "Le présent contrat organise un partage de revenus au profit de l'Investisseur, en contrepartie d'un apport destiné au financement des actions marketing de Scaniha. Il n'emporte aucune cession de parts, ni prise de participation au capital, ni droit de gestion ou de vote."),
    ('Article 2 — Apport', "L'Investisseur verse à l'Éditeur la somme de ____________ TND (palier : ________________), en une seule fois, à la signature des présentes."),
    ('Article 3 — Mécanisme', "L'Éditeur affecte 20 % de ses revenus nets mensuels à un « pool investisseurs ». La part de l'Investisseur dans ce pool est égale à son apport divisé par le montant total de la levée (2 000 TND). Le reversement est mensuel ; les premiers versements remboursent l'apport, puis la prime."),
    ('Article 4 — Plafond de retour', "L'Investisseur perçoit au total au maximum ______ × son apport, soit ____________ TND. Atteint ce plafond, les reversements cessent définitivement."),
    ('Article 5 — Durée', "Le partage court à compter du ____ / ____ / ________ et prend fin à l'atteinte du plafond (Article 4) ou à l'écoulement de 36 mois, au premier des deux termes."),
    ('Article 6 — Transparence', "L'Éditeur communique chaque mois à l'Investisseur un relevé des revenus nets et du montant reversé."),
    ('Article 7 — Absence de droits sociaux', "L'Investisseur ne dispose d'aucun droit de propriété, de vote ou de gestion sur Scaniha. L'Éditeur conserve l'entière liberté d'exploitation."),
    ('Article 8 — Risque', "L'Investisseur reconnaît qu'il s'agit d'un investissement à risque, que le rendement dépend de l'activité future et n'est pas garanti, et qu'il peut ne pas récupérer l'intégralité de son apport."),
    ('Article 9 — Droit applicable', "Le présent contrat est soumis au droit tunisien. Les parties s'efforceront de régler tout différend à l'amiable."),
   ], 'fait': "Fait à ________________, le ____ / ____ / ________, en deux exemplaires originaux.",
   'sig': [["L'Éditeur (Scaniha)", "L'Investisseur"], ['Nom : ____________________     Signature :', 'Nom : ____________________     Signature :']],
   'note': "Modèle fourni à titre indicatif — ne constitue pas un conseil juridique. Faites-le relire par un professionnel avant signature."},
 'ar': {'title': 'عقد اقتسام الإيرادات', 'sub': 'نموذج — يُعدَّل ويُوقَّع في نسختين.',
   'arts': [
    ('بين الطرفين', "الناشر: Scaniha، الصادرة عن Rakiza Group، يمثّلها ________________________، ويُشار إليها بـ « الناشر »؛ والمستثمر: ________________________، بطاقة تعريف رقم ____________، القاطن بـ ________________________، ويُشار إليه بـ « المستثمر »."),
    ('المادة 1 — الموضوع', "ينظّم هذا العقد اقتسام الإيرادات لفائدة المستثمر، مقابل مساهمة مخصَّصة لتمويل الأنشطة التسويقية لـ Scaniha. ولا يترتّب عنه أي تنازل عن حصص، ولا مشاركة في رأس المال، ولا حق في التسيير أو التصويت."),
    ('المادة 2 — المساهمة', "يدفع المستثمر للناشر مبلغ ____________ د.ت (الفئة: ________________)، دفعة واحدة عند إمضاء هذا العقد."),
    ('المادة 3 — الآلية', "يخصّص الناشر 20% من إيراداته الصافية الشهرية لـ « محفظة المستثمرين ». وحصة المستثمر في هذه المحفظة تساوي مساهمته مقسومة على إجمالي التمويل (2 000 د.ت). يتمّ الصرف شهريًا؛ الدفعات الأولى تُرجِع المساهمة، ثم تأتي الأرباح."),
    ('المادة 4 — سقف العائد', "يتلقّى المستثمر إجمالًا بحدّ أقصى ______ × مساهمته، أي ____________ د.ت. وعند بلوغ هذا السقف تتوقّف الدفعات نهائيًا."),
    ('المادة 5 — المدّة', "يبدأ الاقتسام من تاريخ ____ / ____ / ________ وينتهي ببلوغ السقف (المادة 4) أو بمرور 36 شهرًا، أيّهما أوّلًا."),
    ('المادة 6 — الشفافية', "يوافي الناشر المستثمر كل شهر بكشف للإيرادات الصافية وللمبلغ المصروف."),
    ('المادة 7 — انعدام الحقوق في الشركة', "لا يتمتّع المستثمر بأي حق ملكية أو تصويت أو تسيير في Scaniha. ويحتفظ الناشر بكامل حرية الاستغلال."),
    ('المادة 8 — المخاطر', "يُقرّ المستثمر بأنّه استثمار محفوف بالمخاطر، وأنّ العائد مرتبط بالنشاط المستقبلي وغير مضمون، وأنّه قد لا يسترجع كامل مساهمته."),
    ('المادة 9 — القانون المطبَّق', "يخضع هذا العقد للقانون التونسي. ويسعى الطرفان إلى تسوية أي نزاع بالتراضي."),
   ], 'fait': "حُرِّر بـ ________________، في ____ / ____ / ________، في نسختين أصليتين.",
   'sig': [['الناشر (Scaniha)', 'المستثمر'], ['الاسم: ____________________     الإمضاء:', 'الاسم: ____________________     الإمضاء:']],
   'note': "نموذج إرشادي — لا يُعدّ استشارة قانونية. يُنصح بعرضه على مختصّ قبل الإمضاء."},
}

def contrat(lang):
    k = K[lang]; rtl = lang == 'ar'
    S, para, ch, cc, tbl, bullets, callout = mk(rtl)
    st = [para(k['title'], 'h1'), para(k['sub'], 'tag'), HRFlowable(width='100%', thickness=1, color=ORANGE, spaceBefore=6, spaceAfter=6)]
    for h, b in k['arts']:
        st += [para(h, 'h2'), para(b)]
    st += [Spacer(1, 8), para(k['fait']), Spacer(1, 16)]
    st += [tbl([[ch(k['sig'][0][0]), ch(k['sig'][0][1])], [cc(k['sig'][1][0]), cc(k['sig'][1][1])]], [8.5 * cm, 8.5 * cm])]
    st += [Spacer(1, 8), para(k['note'], 'small')]
    suffix = 'AR' if rtl else 'FR'
    build(os.path.join(OUT, 'Scaniha - Contrat de partage de revenus (%s).pdf' % suffix), k['title'], st, rtl)

for lg in ('fr', 'ar'):
    dossier(lg); contrat(lg)
print('DONE')

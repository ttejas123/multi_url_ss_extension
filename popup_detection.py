# pip install opencv-python pytesseract pillow

import cv2
import pytesseract

def detect_popup(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    blur = cv2.GaussianBlur(gray, (5,5), 0)
    edges = cv2.Canny(blur, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h, w = gray.shape
    popup_candidates = []

    for cnt in contours:
        x,y,cw,ch = cv2.boundingRect(cnt)
        area = cw * ch

        if (
            area > (w*h)*0.15 and
            cw > w*0.3 and
            ch > h*0.25
        ):
            popup_candidates.append((x,y,cw,ch))

    return len(popup_candidates) > 0

def popup_has_text(image_path):
    img = cv2.imread(image_path)
    text = pytesseract.image_to_string(img)

    keywords = ["accept", "allow", "agree", "continue", "cookies", "sign in"]

    return any(k.lower() in text.lower() for k in keywords)

has_popup = detect_popup(img) and popup_has_text(img)
if has_popup:
    print("Popup detected with text.")
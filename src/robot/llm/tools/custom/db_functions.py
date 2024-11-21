def re_like(name, text):
  return f" LOWER(REGEXP_REPLACE({name}, \"[^a-zA-Z]+\", \"\" )) LIKE LOWER(REGEXP_REPLACE(\"%{text}%\",  \"[^a-zA-Z%]+\", \"\" )) "

def re_like_coalesce(name, text, default):
  return f" LOWER(coalesce(REGEXP_REPLACE({name}, \"[^a-zA-Z]+\", \"\" ), \"{default}\")) LIKE LOWER(REGEXP_REPLACE(\"%{text}%\",  \"[^a-zA-Z%]+\", \"\" )) "

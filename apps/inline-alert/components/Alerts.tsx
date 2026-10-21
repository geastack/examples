import { Component } from '@geastack/core'
import { InlineAlert } from '@geastack/elements'
import { demo } from '../stores/DemoStore'

// Each alert sits in its own class component that reads the store, the way
// e-reader's OpeningModal does, with an element as the template's root. In
// a native build, a component inside a conditional branch keeps the props it
// was first built with, and so does a class whose template root is the
// InlineAlert itself; this shape follows the store.
// The language switch changes every text, including the severity labels, to
// show localized content wrapping in the same layout. With the built-in
// bitmap font, pixel targets draw the Turkish letters as `?`.

class InfoAlert extends Component {
  template() {
    return (
      <div>
        <InlineAlert
          id="demo-info"
          class="demo-alert"
          title={demo.turkish ? 'Güncelleme hazır' : 'Update ready'}
          message={demo.turkish ? 'Sürüm 2 yüklenmeye hazır.' : 'Version 2 is ready to install.'}
          severityLabel={demo.turkish ? 'Bilgi' : undefined}
          dismissible={true}
          dismissLabel={demo.turkish ? 'Kapat' : undefined}
          onDismiss={() => demo.dismiss('info')}
        />
      </div>
    )
  }
}

class SuccessAlert extends Component {
  template() {
    return (
      <div>
        <InlineAlert
          class="demo-alert"
          variant="success"
          message={demo.turkish ? 'Ayarlar kaydedildi.' : 'Settings saved.'}
          severityLabel={demo.turkish ? 'Başarılı' : undefined}
          dismissible={true}
          dismissLabel={demo.turkish ? 'Kapat' : undefined}
          onDismiss={() => demo.dismiss('success')}
        />
      </div>
    )
  }
}

class WarningAlert extends Component {
  template() {
    return (
      <div>
        <InlineAlert
          class="demo-alert demo-alert--narrow"
          variant="warning"
          message={
            demo.turkish
              ? 'Pil zayıf. Cihaz kapanmadan önce şarj cihazını bağlayın.'
              : 'The battery is low. Connect the charger before the device turns off.'
          }
          severityLabel={demo.turkish ? 'Uyarı' : undefined}
          dismissible={true}
          dismissLabel={demo.turkish ? 'Kapat' : undefined}
          onDismiss={() => demo.dismiss('warning')}
        />
      </div>
    )
  }
}

class ErrorAlert extends Component {
  template() {
    return (
      <div>
        <InlineAlert
          class="demo-alert"
          variant="error"
          title={demo.turkish ? 'Yükleme başarısız' : 'Upload failed'}
          message={(demo.turkish ? 'Deneme sayısı: ' : 'Retries: ') + demo.retries}
          severityLabel={demo.turkish ? 'Hata' : undefined}
          actionLabel={demo.turkish ? 'Tekrar dene' : 'Retry'}
          onAction={() => demo.retry()}
          dismissible={true}
          dismissLabel={demo.turkish ? 'Kapat' : undefined}
          onDismiss={() => demo.dismiss('error')}
        />
      </div>
    )
  }
}

export function Alerts() {
  return (
    <div class="demo-alerts">
      {demo.infoOpen ? <InfoAlert /> : null}
      {demo.successOpen ? <SuccessAlert /> : null}
      {demo.warningOpen ? <WarningAlert /> : null}
      {demo.errorOpen ? <ErrorAlert /> : null}
    </div>
  )
}
